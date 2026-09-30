"""Weekly command line for the Buffr Checkpoint content system.

    python -m checkpoint_social init-db
    python -m checkpoint_social generate [--week 2026-10-05] [--budget 3]
    python -m checkpoint_social review
    python -m checkpoint_social export [--week 2026-10-05]
    python -m checkpoint_social render [--week 2026-10-05] [--no-illustrations] [--budget 1]
    python -m checkpoint_social publish <post-id-prefix> --url <link>
    python -m checkpoint_social signals <post-id-prefix> --signups 1 --dms-with-story 2 ...
    python -m checkpoint_social story --role "branch manager" --sector banking --incident "..."
    python -m checkpoint_social scoreboard
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

from .agents import CostLedger
from .config import load_settings
from .db import Database
from .illustrator import illustrate
from .guardrails import check_draft
from .models import PostBrief, PostDraft
from .router import expected_cost, quality
from .strategy import VISUAL_SYSTEM


def next_monday(today: date | None = None) -> date:
    today = today or date.today()
    return today + timedelta(days=(7 - today.weekday()) % 7 or 7)


def _brief_and_draft(row) -> tuple[PostBrief, PostDraft]:
    brief = PostBrief(
        platform=row["platform"], pillar=row["pillar"], format=row["format"], audience=row["audience"],
        angle=row["angle"], discovery_question=row["discovery_question"], cta=row["cta_kind"],
        explore=row["explore"],
    )
    draft = PostDraft(
        hook=row["hook"], body=row["body"], slides=json.loads(row["slides"]) if isinstance(row["slides"], str) else row["slides"],
        visual_brief=row["visual_brief"], alt_text=row["alt_text"], hashtags=list(row["hashtags"]),
        cta_text=row["cta_text"],
    )
    return brief, draft


def _print_post(row) -> None:
    brief, draft = _brief_and_draft(row)
    bar = "=" * 72
    print(f"\n{bar}\n{row['platform'].upper()} | {row['pillar']} | {row['format']} | "
          f"id {str(row['id'])[:8]} | status {row['status']}")
    print(f"writer {row['writer_model']} (revisions {row['revision_count']}) | "
          f"mom {row['mom_test_score']} premium {row['premium_score']} fit {row['platform_fit_score']} | "
          f"${float(row['generation_cost_usd']):.4f}")
    print(f"audience: {brief.audience}\nangle: {brief.angle}\n{bar}")
    print(draft.hook, "\n")
    print(draft.body)
    for i, slide in enumerate(draft.slides, 1):
        print(f"  [{i}] {slide}")
    print(f"\n{draft.cta_text}")
    if draft.hashtags:
        print(" ".join(draft.hashtags))
    print(f"\nvisual: {draft.visual_brief}\nalt: {draft.alt_text}")
    notes = json.loads(row["review_notes"]) if isinstance(row["review_notes"], str) else row["review_notes"]
    if notes:
        print("\nreview notes:")
        for n in notes:
            print(f"  - {n}")


def _edit(text: str) -> str:
    editor = os.environ.get("EDITOR")
    if editor:
        with tempfile.NamedTemporaryFile("w+", suffix=".md", delete=False) as handle:
            handle.write(text)
            path = handle.name
        subprocess.call([*editor.split(), path])
        edited = Path(path).read_text()
        Path(path).unlink(missing_ok=True)
        return edited.strip()
    print("Enter the new body. Finish with a line containing only a single dot.")
    lines = []
    for line in sys.stdin:
        if line.rstrip("\n") == ".":
            break
        lines.append(line.rstrip("\n"))
    return "\n".join(lines).strip()


# ----------------------------------------------------------------- commands


async def cmd_init_db(db: Database, _args) -> None:
    await db.apply_schema()
    print("Schema applied.")


async def cmd_generate(db: Database, args, settings) -> None:
    from .workflow import generate_week

    if args.budget:
        settings.weekly_budget_usd = args.budget
    settings.validate()
    week = date.fromisoformat(args.week) if args.week else next_monday()
    print(f"Generating week of {week} | budget ${settings.weekly_budget_usd:.2f} | "
          f"writers {', '.join(settings.writer_models)}")
    summary = await generate_week(settings, db, week, seed=args.seed)
    print(f"\nRun {str(summary['run_id'])[:8]}: {summary['saved']} saved "
          f"({summary['needs_human']} need your attention), {summary['dropped']} dropped, "
          f"{summary['calls']} model calls, ${summary['spent_usd']:.4f} spent.")
    print("Next: python -m checkpoint_social review")


async def cmd_review(db: Database, _args) -> None:
    rows = await db.posts_for_review()
    if not rows:
        print("Nothing to review.")
        return
    for row in rows:
        _print_post(row)
        while True:
            choice = input("\n[a]pprove  [r]eject  [e]dit body  [h]ook edit  [s]kip  [q]uit > ").strip().lower()
            if choice == "a":
                await db.set_review(row["id"], "approved")
                break
            if choice == "r":
                await db.set_review(row["id"], "rejected", note=input("Why (feeds model scoring)? ").strip() or None)
                break
            if choice in {"e", "h"}:
                brief, draft = _brief_and_draft(row)
                if choice == "e":
                    draft = draft.model_copy(update={"body": _edit(draft.body)})
                else:
                    draft = draft.model_copy(update={"hook": input("New hook: ").strip() or draft.hook})
                problems = check_draft(brief, draft)
                for p in problems:
                    print(f"  ! {p.render()}")
                if problems and input("Guardrails flagged the edit. Approve anyway? [y/N] ").strip().lower() != "y":
                    continue
                await db.set_review(row["id"], "approved", body=draft.body, hook=draft.hook)
                break
            if choice == "s":
                break
            if choice == "q":
                return


async def cmd_export(db: Database, args, settings) -> None:
    week = date.fromisoformat(args.week) if args.week else None
    rows = await db.approved_posts(week)
    if not rows:
        print("No approved posts to export.")
        return
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    path = settings.output_dir / f"checkpoint-social-{week or 'all-approved'}.md"
    lines = [f"# Buffr Checkpoint posts: {week or 'all approved'}", "", "## Visual system", VISUAL_SYSTEM]
    for row in rows:
        brief, draft = _brief_and_draft(row)
        lines += [
            f"\n---\n\n## {brief.platform.upper()} | {brief.pillar} | {brief.format} | `{str(row['id'])[:8]}`",
            f"\n**Discovery question to use in replies:** {brief.discovery_question}\n",
            "### Copy", "", draft.hook, "", draft.body, "",
        ]
        if draft.slides:
            lines += ["### Slides / shots / tweets", *[f"{i}. {s}" for i, s in enumerate(draft.slides, 1)], ""]
        lines += [draft.cta_text, "", " ".join(draft.hashtags), "",
                  "### Visual brief", draft.visual_brief, "", f"**Alt text:** {draft.alt_text}"]
    path.write_text("\n".join(lines) + "\n")
    print(f"Exported {len(rows)} posts to {path}")
    print("After posting each one: python -m checkpoint_social publish <id> --url <link>")


async def cmd_render(db: Database, args, settings) -> None:
    """Images for APPROVED posts only, so rejected drafts never cost an illustration."""
    from .render import render_post, svg_to_image, write_index, write_manifest

    week = date.fromisoformat(args.week) if args.week else None
    rows = await db.posts_to_render(week, include_unreviewed=args.all)
    if not rows:
        print("No posts to render. Approve drafts with `review`, or pass --all to include unreviewed drafts.")
        return
    budget = args.budget if args.budget is not None else settings.render_budget_usd
    ledger = CostLedger(budget_usd=budget)
    reserved: list[float] = []
    illustrate_on = not args.no_illustrations and bool(settings.illustrator_models)

    by_week: dict[date, list] = {}
    for row in rows:
        by_week.setdefault(row["week_of"], []).append(row)

    for wk, week_rows in by_week.items():
        week_dir = settings.output_dir / wk.isoformat()
        run_id = await db.create_run(wk, budget)
        calls_before, spent_before = len(ledger.calls), ledger.spent
        entries = []
        try:
            for row in week_rows:
                brief, draft = _brief_and_draft(row)
                folder = week_dir / brief.platform / str(row["id"])

                async def illustrate_cover(text, viewbox, _row=row, _folder=folder):
                    if not illustrate_on:
                        return None, {"skipped": True}
                    res = await illustrate(
                        brief_text=text, viewbox=viewbox, settings=settings, resolve=lambda name: name,
                        ledger=ledger, reserved=reserved, post_id=_row["id"],
                    )
                    info = {"model": res.model, "description": res.description, "attempts": res.attempts,
                            "fell_back": res.fell_back, "problems": res.problems,
                            "cost_usd": round(ledger.cost_for_post(_row["id"]), 6)}
                    if res.fell_back or res.svg is None:
                        return None, info
                    _folder.mkdir(parents=True, exist_ok=True)
                    (_folder / "illustration.svg").write_text(res.svg)
                    return svg_to_image(res.svg, *viewbox), info

                rendered = await render_post(row, brief, draft, week_dir, illustrate_cover)
                if (rendered.folder / "illustration.svg").exists():
                    rendered.files.append("illustration.svg")
                entries.append({
                    "id": rendered.post_id, "platform": brief.platform, "pillar": brief.pillar,
                    "format": brief.format, "status": row["status"], "writer_model": row["writer_model"],
                    "generation_cost_usd": float(row["generation_cost_usd"]),
                    "folder": str(rendered.folder.relative_to(week_dir)), "files": rendered.files,
                    "placeholders": rendered.placeholders, "illustration": rendered.illustration,
                })
                flag = f"  {len(rendered.placeholders)} placeholder(s)" if rendered.placeholders else ""
                print(f"  {brief.platform:9} {str(row['id'])[:8]}  {len(rendered.files)} files{flag}")
        except Exception as exc:
            await db.record_calls(run_id, ledger.calls[calls_before:])
            await db.finish_run(run_id, "failed", ledger.spent - spent_before, theme="render: images",
                                error=f"{type(exc).__name__}: {exc}"[:1000])
            raise
        spent = ledger.spent - spent_before
        manifest = write_manifest(week_dir, wk.isoformat(), str(run_id), spent, entries)
        index = write_index(week_dir, wk.isoformat(), entries)
        await db.record_calls(run_id, ledger.calls[calls_before:])
        await db.finish_run(run_id, "completed", spent, theme="render: images")
        print(f"Week {wk}: {len(entries)} posts rendered to {week_dir}/ (${spent:.4f} on illustrations).")
        print(f"  Open in a browser: {index.resolve()}")


async def cmd_publish(db: Database, args) -> None:
    await db.mark_published(await db.resolve_post_id(args.post_id), args.url)
    print("Marked published.")


async def cmd_signals(db: Database, args) -> None:
    metrics = {k: getattr(args, k) for k in (
        "impressions", "likes", "comments", "meaningful_comments", "shares", "saves",
        "link_clicks", "dms_with_story", "signups")}
    await db.record_signals(await db.resolve_post_id(args.post_id), metrics)
    print("Signals recorded.")


async def cmd_story(db: Database, args) -> None:
    post_id = await db.resolve_post_id(args.post_id) if args.post_id else None
    await db.record_story({
        "post_id": post_id, "platform": args.platform, "role": args.role, "sector": args.sector,
        "incident": args.incident, "current_workaround": args.workaround, "cost_of_problem": args.cost,
        "consent_to_paraphrase": args.consent,
    })
    print("Story logged." + ("" if args.consent else " (Not consented: used for planning themes only.)"))


async def cmd_scoreboard(db: Database, _args, settings) -> None:
    stats = await db.model_stats()
    print("\nWRITER MODELS (last 120 days)")
    print(f"{'model':42} {'posts':>5} {'1st-pass':>8} {'approve':>8} {'signal':>7} {'$/post':>8} {'quality':>7}")
    for model in settings.writer_models:
        s = stats.get(model)
        if not s:
            print(f"{model:42} {'0':>5}   no history yet (prior est ${settings.estimate(model, 'writer') * 1.5:.4f}/post)")
            continue
        fmt = lambda v, p=2: "-" if v is None else f"{v:.{p}f}"  # noqa: E731
        print(f"{model:42} {s.posts:>5} {fmt(s.first_pass_rate):>8} {fmt(s.approval_rate):>8} "
              f"{fmt(s.signal_index):>7} {expected_cost(settings, s):>8.4f} {quality(s):>7.2f}")

    print("\nPILLARS THAT WIN (approved/published posts)")
    for r in await db.pillar_performance():
        print(f"  {r['platform']:9} {r['pillar']:20} posts {r['posts']:>3}  measured {r['measured']:>3}  "
              f"index {r['signal_index'] if r['signal_index'] is not None else '-':>5}  "
              f"signups {r['signups']:>3}  story DMs {r['story_dms']:>3}")

    print("\nRECENT RUNS")
    for r in await db.recent_runs():
        print(f"  {r['week_of']}  {r['status']:9} posts {r['posts']:>3}  "
              f"${float(r['spent_usd']):.4f} of ${float(r['budget_usd']):.2f}  {r['theme'] or ''}")


# --------------------------------------------------------------------- main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="checkpoint_social", description="Buffr Checkpoint weekly content system")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init-db", help="apply schema.sql to Neon")

    gen = sub.add_parser("generate", help="plan, write and review next week's posts")
    gen.add_argument("--week", help="Monday of the target week, YYYY-MM-DD (default: next Monday)")
    gen.add_argument("--budget", type=float, help="override SOCIAL_WEEKLY_BUDGET_USD")
    gen.add_argument("--seed", type=int, help="fix router exploration for reproducible runs")

    sub.add_parser("review", help="approve, edit or reject drafts")
    exp = sub.add_parser("export", help="write approved posts to a markdown file")
    exp.add_argument("--week", help="YYYY-MM-DD; omit for every approved post")

    ren = sub.add_parser("render", help="render images for approved posts into out/<week>/")
    ren.add_argument("--week", help="YYYY-MM-DD; omit for every approved post")
    ren.add_argument("--no-illustrations", action="store_true", help="templates only, no model calls")
    ren.add_argument("--all", action="store_true", help="also render drafts and needs_human posts, not just approved")
    ren.add_argument("--budget", type=float, help="override SOCIAL_RENDER_BUDGET_USD")

    pub = sub.add_parser("publish", help="mark a post as published")
    pub.add_argument("post_id")
    pub.add_argument("--url")

    sig = sub.add_parser("signals", help="record results a few days after posting")
    sig.add_argument("post_id")
    for flag in ("impressions", "likes", "comments", "meaningful-comments", "shares", "saves",
                 "link-clicks", "dms-with-story", "signups"):
        sig.add_argument(f"--{flag}", type=int, default=0)

    story = sub.add_parser("story", help="log a real story from a comment, DM or call")
    story.add_argument("--role", required=True)
    story.add_argument("--sector", required=True)
    story.add_argument("--incident", required=True, help="what actually happened, anonymised")
    story.add_argument("--workaround")
    story.add_argument("--cost", help="time, money or risk it cost them")
    story.add_argument("--platform")
    story.add_argument("--post-id")
    story.add_argument("--consent", action="store_true", help="they agreed to an anonymised paraphrase")

    sub.add_parser("scoreboard", help="model and pillar performance")
    return parser


async def main_async(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    settings = load_settings()
    if not settings.database_url:
        raise SystemExit("Set SOCIAL_DATABASE_URL (or DATABASE_URL) to your Neon connection string.")
    db = await Database.connect(settings.database_url)
    try:
        match args.command:
            case "init-db":
                await cmd_init_db(db, args)
            case "generate":
                await cmd_generate(db, args, settings)
            case "review":
                await cmd_review(db, args)
            case "export":
                await cmd_export(db, args, settings)
            case "render":
                await cmd_render(db, args, settings)
            case "publish":
                await cmd_publish(db, args)
            case "signals":
                await cmd_signals(db, args)
            case "story":
                await cmd_story(db, args)
            case "scoreboard":
                await cmd_scoreboard(db, args, settings)
    finally:
        await db.close()


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
