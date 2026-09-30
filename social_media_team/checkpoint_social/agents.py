"""Pydantic AI agents. Each role is a typed Agent; LangGraph decides when each runs.

Agents are built per model so the router can swap models without code changes.
The shared context pack is placed first in every prompt so provider prompt
caching can reuse it across the week's calls.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic_ai import Agent, ModelRetry, NativeOutput, RunContext
from pydantic_ai.models import Model
from pydantic_ai.settings import ModelSettings

from .config import Settings
from .db import CallRecord
from .models import CriticReview, PostDraft, WeekPlan
from .strategy import PLATFORM_RULES, context_pack

ModelRef = str | Model
ModelResolver = Callable[[str], ModelRef]


class BudgetExceeded(RuntimeError):
    pass


@dataclass
class CostLedger:
    """Tracks spend for the run and refuses calls that would break the budget."""

    budget_usd: float
    calls: list[CallRecord] = field(default_factory=list)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def spent(self) -> float:
        return sum(c.cost_usd for c in self.calls)

    @property
    def remaining(self) -> float:
        return self.budget_usd - self.spent

    def cost_for_post(self, post_id: uuid.UUID) -> float:
        return sum(c.cost_usd for c in self.calls if c.post_id == post_id)

    async def reserve(self, estimate: float, reserved: list[float]) -> None:
        async with self._lock:
            if self.spent + sum(reserved) + estimate > self.budget_usd:
                raise BudgetExceeded(f"Budget ${self.budget_usd:.2f} would be exceeded (spent ${self.spent:.4f}).")
            reserved.append(estimate)

    async def record(self, call: CallRecord, reserved: list[float], estimate: float) -> None:
        async with self._lock:
            reserved.remove(estimate)
            self.calls.append(call)


# ---------------------------------------------------------------- agents ----


@dataclass
class PlanDeps:
    cadence: dict[str, int]


PLANNER_INSTRUCTIONS = f"""\
{context_pack()}

You are the content strategist. Plan one week of posts using Play to Win:
exploit pillars and formats with real signals, keep about 30 percent of posts
exploratory (explore=true), and never repeat a recent hook or angle.
Every discovery_question must ask about a specific past event.
Match the platform cadence exactly.
"""

WRITER_INSTRUCTIONS = f"""\
{context_pack()}

You are the copywriter. Write one post that follows the brief exactly.
Platform rules:
""" + "\n".join(f"- {name}: {rule}" for name, rule in PLATFORM_RULES.items()) + """

Rules: open with the reader's own experience; product comes second as the answer;
use only approved facts; never invent stories, names, quotes or numbers; no em
dashes; the visual_brief must use the brand visual system and name the asset
files to use. For carousels put one slide per list item in slides; for threads
put one tweet per item; for reel scripts put one shot per item.
"""

CRITIC_INSTRUCTIONS = f"""\
{context_pack()}

You are the brand and compliance editor. Score the draft strictly.
mom_test_score: does it open with the reader's lived experience, ask about a
specific past event, avoid hypotheticals, pitching first and compliment fishing?
premium_score: calm, precise, confident, restrained, credible to a bank
compliance officer; deduct for hype, fear, cliches, exclamation marks, filler.
platform_fit_score: length, format and tone right for the platform.
claim_violations: quote every breach of the claim rules. Rejecting a claim
(e.g. "we won't tell you we make you compliant") is NOT a violation.
rewrite_guidance: concrete edits, or 'none' if nothing needs changing.
"""


def planner_agent(model: ModelRef) -> Agent[PlanDeps, WeekPlan]:
    agent = Agent(
        model,
        # Native structured output: Claude 5-family models reject the forced tool_choice
        # that Pydantic AI's default tool output needs.
        output_type=NativeOutput(WeekPlan),
        deps_type=PlanDeps,
        instructions=PLANNER_INSTRUCTIONS,
        model_settings=ModelSettings(max_tokens=4000),
        retries=3,
        defer_model_check=True,
    )

    @agent.output_validator
    def validate_cadence(ctx: RunContext[PlanDeps], plan: WeekPlan) -> WeekPlan:
        counts = Counter(b.platform for b in plan.briefs)
        expected = {p: n for p, n in ctx.deps.cadence.items() if n}
        if dict(counts) != expected:
            raise ModelRetry(f"Platform mix must be exactly {expected}; you produced {dict(counts)}.")
        bad = [b.discovery_question for b in plan.briefs if b.discovery_question.lower().startswith(("would", "imagine"))]
        if bad:
            raise ModelRetry(f"These discovery questions are hypothetical; ask about a past event: {bad}")
        return plan

    return agent


def writer_agent(model: ModelRef) -> Agent[None, PostDraft]:
    return Agent(
        model,
        output_type=NativeOutput(PostDraft),
        instructions=WRITER_INSTRUCTIONS,
        model_settings=ModelSettings(max_tokens=2500),
        retries=2,
        defer_model_check=True,
    )


def critic_agent(model: ModelRef) -> Agent[None, CriticReview]:
    return Agent(
        model,
        output_type=NativeOutput(CriticReview),
        instructions=CRITIC_INSTRUCTIONS,
        model_settings=ModelSettings(max_tokens=1200),
        retries=2,
        defer_model_check=True,
    )


AGENT_FACTORIES = {"planner": planner_agent, "writer": writer_agent, "critic": critic_agent}


# ------------------------------------------------------------- metering -----


def _usage_tokens(result: Any) -> tuple[int, int]:
    usage = result.usage() if callable(result.usage) else result.usage
    return int(usage.input_tokens or 0), int(usage.output_tokens or 0)


async def run_metered(
    *,
    role: str,
    model_name: str,
    prompt: str,
    settings: Settings,
    resolve: ModelResolver,
    ledger: CostLedger,
    reserved: list[float],
    deps: Any = None,
    post_id: uuid.UUID | None = None,
    transient_retries: int = 2,
) -> Any:
    """Run one agent call with budget reservation, retries and cost recording."""
    estimate = settings.estimate(model_name, role)
    await ledger.reserve(estimate, reserved)
    agent = AGENT_FACTORIES[role](resolve(model_name))
    attempt = 0
    while True:
        started = time.perf_counter()
        try:
            result = await agent.run(prompt, deps=deps)
        except Exception as exc:  # network, rate limit, validation exhaustion
            latency = int((time.perf_counter() - started) * 1000)
            retryable = attempt < transient_retries and _is_transient(exc)
            if retryable:
                attempt += 1
                await asyncio.sleep(2 ** attempt)
                continue
            await ledger.record(
                CallRecord(role, model_name, 0, 0, 0.0, latency, False, post_id, f"{type(exc).__name__}: {exc}"[:500]),
                reserved, estimate,
            )
            raise
        latency = int((time.perf_counter() - started) * 1000)
        tokens_in, tokens_out = _usage_tokens(result)
        cost = settings.price(model_name).cost(tokens_in, tokens_out)
        await ledger.record(
            CallRecord(role, model_name, tokens_in, tokens_out, cost, latency, True, post_id), reserved, estimate
        )
        return result.output


def _is_transient(exc: Exception) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return any(marker in text for marker in ("rate", "429", "overloaded", "529", "timeout", "connection", "503"))

