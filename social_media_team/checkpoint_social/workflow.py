"""LangGraph orchestration for one weekly run.

    START -> load_context -> plan_week -> draft_posts -> review_posts
                                                           |
                  revise_posts <-- failing & revisions left & budget
                       |                                   |
                       +---------> review_posts            v
                                                       save_posts -> END

Nodes are thin: they call Pydantic AI agents through run_metered and return
state updates. No LLM SDK calls happen here directly.
"""

from __future__ import annotations

import asyncio
import random
import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .agents import BudgetExceeded, CostLedger, ModelResolver, PlanDeps, run_metered
from .config import Settings
from .db import Database
from .guardrails import check_draft
from .models import CriticReview, PostBrief, PostDraft, WeekPlan
from .router import ModelStats, choose_writer, stronger
from .strategy import REVIEW_THRESHOLDS, WEEKLY_CADENCE


class RunState(TypedDict, total=False):
    run_id: uuid.UUID
    week_of: date
    cadence: dict[str, int]
    context: dict[str, Any]
    plan: dict[str, Any]
    items: list[dict[str, Any]]
    summary: dict[str, Any]


@dataclass
class RunDeps:
    settings: Settings
    db: Database
    resolve: ModelResolver
    ledger: CostLedger
    rng: random.Random


# ------------------------------------------------------------ prompt helpers


def _render_draft(draft: dict[str, Any]) -> str:
    slides = "\n".join(f"  {i}. {s}" for i, s in enumerate(draft["slides"], 1))
    return (
        f"HOOK: {draft['hook']}\nBODY:\n{draft['body']}\n"
        + (f"SLIDES:\n{slides}\n" if slides else "")
        + f"CTA: {draft['cta_text']}\nHASHTAGS: {' '.join(draft['hashtags'])}\n"
        f"VISUAL BRIEF: {draft['visual_brief']}\nALT TEXT: {draft['alt_text']}"
    )


def _brief_block(brief: dict[str, Any]) -> str:
    return "\n".join(f"{k}: {v}" for k, v in brief.items())


def _writer_prompt(item: dict[str, Any], context: dict[str, Any]) -> str:
    parts = [f"BRIEF\n{_brief_block(item['brief'])}"]
    if context["stories"]:
        parts.append(
            "CONSENTED DISCOVERY STORIES (you may paraphrase one if it fits; never add details):\n"
            + "\n".join(f"- {s}" for s in context["stories"])
        )
    if context["recent_hooks"]:
        parts.append("DO NOT REUSE THESE RECENT HOOKS:\n" + "\n".join(f"- {h}" for h in context["recent_hooks"][:20]))
    if item.get("draft"):
        parts.append("PREVIOUS DRAFT\n" + _render_draft(item["draft"]))
        parts.append("FIX ALL OF THESE\n" + "\n".join(f"- {n}" for n in item["notes"]))
    return "\n\n".join(parts)


def _critic_prompt(item: dict[str, Any], violations: list[str]) -> str:
    known = "\n".join(f"- {v}" for v in violations) or "- none"
    return (
        f"BRIEF\n{_brief_block(item['brief'])}\n\nDRAFT\n{_render_draft(item['draft'])}\n\n"
        f"AUTOMATED CHECKS ALREADY FOUND\n{known}"
    )


def _passes(review: CriticReview) -> bool:
    return not review.claim_violations and all(
        getattr(review, field) >= minimum for field, minimum in REVIEW_THRESHOLDS.items()
    )


def _borderline(review: CriticReview) -> bool:
    return any(abs(getattr(review, field) - minimum) <= 1 for field, minimum in REVIEW_THRESHOLDS.items())


# ------------------------------------------------------------------- graph


def build_workflow(deps: RunDeps):
    settings, db, ledger = deps.settings, deps.db, deps.ledger
    reserved: list[float] = []
    semaphore = asyncio.Semaphore(settings.concurrency)

    async def load_context(state: RunState) -> dict:
        stats = await db.model_stats()
        pillars = await db.pillar_performance()
        context = {
            "stats": stats,
            "pillar_table": [dict(r) for r in pillars],
            "recent_hooks": await db.recent_hooks(),
            "stories": await db.consented_stories(),
            "story_themes": await db.story_themes(),
        }
        return {"context": context}

    async def plan_week(state: RunState) -> dict:
        ctx = state["context"]
        table = "\n".join(
            f"- {r['platform']}/{r['pillar']}: posts={r['posts']} measured={r['measured']} "
            f"signal_index={r['signal_index']} signups={r['signups']} story_dms={r['story_dms']}"
            for r in ctx["pillar_table"]
        ) or "- no measured history yet: spread pillars evenly and mark about 30 percent as explore"
        themes = "\n".join(f"- {t}" for t in ctx["story_themes"]) or "- none logged yet"
        hooks = "\n".join(f"- {h}" for h in ctx["recent_hooks"]) or "- none"
        prompt = (
            f"Week of {state['week_of'].isoformat()}.\n"
            f"Cadence (exact): {state['cadence']}\n\n"
            f"PERFORMANCE BY PLATFORM AND PILLAR (signal_index 1.0 = platform average)\n{table}\n\n"
            f"PROBLEMS REAL PEOPLE HAVE DESCRIBED (for angles only, do not quote)\n{themes}\n\n"
            f"RECENT HOOKS TO AVOID\n{hooks}"
        )
        plan: WeekPlan = await run_metered(
            role="planner", model_name=settings.planner_model, prompt=prompt, settings=settings,
            resolve=deps.resolve, ledger=ledger, reserved=reserved, deps=PlanDeps(cadence=state["cadence"]),
        )
        items = [
            {
                "post_id": uuid.uuid4(), "brief": b.model_dump(), "draft": None, "review": None,
                "notes": [], "revisions": 0, "status": "pending",
            }
            for b in plan.briefs
        ]
        return {"plan": plan.model_dump(), "items": items}

    async def _draft(item: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            try:
                draft: PostDraft = await run_metered(
                    role="writer", model_name=item["writer_model"], prompt=_writer_prompt(item, context),
                    settings=settings, resolve=deps.resolve, ledger=ledger, reserved=reserved,
                    post_id=item["post_id"],
                )
            except BudgetExceeded as exc:
                return {**item, "status": "skipped", "notes": item["notes"] + [str(exc)]}
            except Exception as exc:
                return {**item, "status": "failed", "notes": item["notes"] + [f"writer error: {exc}"[:300]]}
            return {**item, "draft": draft.model_dump(), "status": "drafted"}

    async def draft_posts(state: RunState) -> dict:
        stats: dict[str, ModelStats] = state["context"]["stats"]
        items = []
        remaining = len(state["items"])
        for item in state["items"]:
            choice = choose_writer(settings, stats, ledger.remaining - sum(reserved), remaining, deps.rng)
            items.append({**item, "writer_model": choice.model, "initial_writer_model": choice.model,
                          "router_reason": choice.reason})
            remaining -= 1
        drafted = await asyncio.gather(*(_draft(i, state["context"]) for i in items))
        return {"items": list(drafted)}

    async def _review(item: dict[str, Any]) -> dict[str, Any]:
        if item["status"] not in {"drafted", "revised"}:
            return item
        brief = PostBrief.model_validate(item["brief"])
        draft = PostDraft.model_validate(item["draft"])
        violations = [v.render() for v in check_draft(brief, draft)]
        prompt = _critic_prompt(item, violations)
        review: CriticReview | None = None
        critic_used = None
        async with semaphore:
            for critic in settings.critic_models:  # cascade: escalate only when needed
                try:
                    review = await run_metered(
                        role="critic", model_name=critic, prompt=prompt, settings=settings,
                        resolve=deps.resolve, ledger=ledger, reserved=reserved, post_id=item["post_id"],
                    )
                except BudgetExceeded:
                    break
                critic_used = critic
                if not _borderline(review):
                    break
        if review is None:
            return {**item, "status": "needs_human", "notes": violations + ["critic unavailable (budget or error)"]}
        notes = violations + [f"claim: {c}" for c in review.claim_violations] + review.issues
        if review.rewrite_guidance and review.rewrite_guidance.strip().lower() != "none":
            notes.append(f"guidance: {review.rewrite_guidance}")
        passed = not violations and _passes(review)
        return {**item, "review": review.model_dump(), "critic_model": critic_used, "notes": notes,
                "status": "passed" if passed else "failing"}

    async def review_posts(state: RunState) -> dict:
        return {"items": list(await asyncio.gather(*(_review(i) for i in state["items"])))}

    def route_after_review(state: RunState) -> str:
        can_revise = [
            i for i in state["items"]
            if i["status"] == "failing" and i["revisions"] < settings.max_revisions
        ]
        cheapest = min(settings.estimate(m, "writer") for m in settings.writer_models)
        if can_revise and ledger.remaining - sum(reserved) > cheapest:
            return "revise_posts"
        return "save_posts"

    async def _revise(item: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        if item["status"] != "failing" or item["revisions"] >= settings.max_revisions:
            return item
        model = item["writer_model"]
        # Second failure: move up a tier. Performance beats cost once cheap has failed twice.
        if item["revisions"] >= 1:
            model = stronger(settings, model) or model
        revised = await _draft({**item, "writer_model": model}, context)
        if revised["status"] == "drafted":
            revised["status"] = "revised"
        revised["revisions"] = item["revisions"] + 1
        return revised

    async def revise_posts(state: RunState) -> dict:
        return {"items": list(await asyncio.gather(*(_revise(i, state["context"]) for i in state["items"])))}

    async def save_posts(state: RunState) -> dict:
        saved, held, dropped = 0, 0, 0
        for item in state["items"]:
            if item.get("draft") is None:
                dropped += 1
                continue
            status = "draft" if item["status"] == "passed" else "needs_human"
            held += status == "needs_human"
            saved += 1
            await db.insert_post(state["run_id"], {
                **item, "status": status, "cost_usd": ledger.cost_for_post(item["post_id"]),
            })
        await db.record_calls(state["run_id"], ledger.calls)
        await db.finish_run(state["run_id"], "completed", ledger.spent,
                            theme=state["plan"]["theme"], plan=state["plan"])
        return {"summary": {"saved": saved, "needs_human": held, "dropped": dropped, "spent_usd": ledger.spent,
                            "calls": len(ledger.calls)}}

    graph = StateGraph(RunState)
    graph.add_node("load_context", load_context)
    graph.add_node("plan_week", plan_week)
    graph.add_node("draft_posts", draft_posts)
    graph.add_node("review_posts", review_posts)
    graph.add_node("revise_posts", revise_posts)
    graph.add_node("save_posts", save_posts)
    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "plan_week")
    graph.add_edge("plan_week", "draft_posts")
    graph.add_edge("draft_posts", "review_posts")
    graph.add_conditional_edges("review_posts", route_after_review,
                                {"revise_posts": "revise_posts", "save_posts": "save_posts"})
    graph.add_edge("revise_posts", "review_posts")
    graph.add_edge("save_posts", END)
    return graph.compile()


async def generate_week(
    settings: Settings, db: Database, week_of: date, resolve: ModelResolver | None = None,
    cadence: dict[str, int] | None = None, seed: int | None = None,
) -> dict[str, Any]:
    ledger = CostLedger(budget_usd=settings.weekly_budget_usd)
    deps = RunDeps(settings=settings, db=db, resolve=resolve or (lambda name: name), ledger=ledger,
                   rng=random.Random(seed))
    run_id = await db.create_run(week_of, settings.weekly_budget_usd)
    workflow = build_workflow(deps)
    try:
        final = await workflow.ainvoke({"run_id": run_id, "week_of": week_of, "cadence": cadence or WEEKLY_CADENCE})
    except Exception as exc:
        await db.record_calls(run_id, ledger.calls)
        await db.finish_run(run_id, "failed", ledger.spent, error=f"{type(exc).__name__}: {exc}"[:1000])
        raise
    return {"run_id": run_id, **final["summary"]}
