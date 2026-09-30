"""Neon Postgres access. Parameterised queries only."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import asyncpg

from .router import ModelStats

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schema.sql"


@dataclass
class CallRecord:
    role: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: int
    succeeded: bool
    post_id: uuid.UUID | None = None
    error: str | None = None


class Database:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    @classmethod
    async def connect(cls, dsn: str) -> "Database":
        # statement_cache_size=0 keeps asyncpg compatible with Neon's pooled (pgbouncer) endpoint.
        pool = await asyncpg.create_pool(dsn, min_size=1, max_size=4, statement_cache_size=0)
        return cls(pool)

    async def close(self) -> None:
        await self.pool.close()

    async def apply_schema(self) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(SCHEMA_PATH.read_text())

    # --- runs -----------------------------------------------------------------

    async def create_run(self, week_of: date, budget_usd: float) -> uuid.UUID:
        run_id = uuid.uuid4()
        await self.pool.execute(
            "INSERT INTO content_runs (id, week_of, budget_usd) VALUES ($1, $2, $3)",
            run_id, week_of, budget_usd,
        )
        return run_id

    async def finish_run(
        self, run_id: uuid.UUID, status: str, spent_usd: float,
        theme: str | None = None, plan: dict | None = None, error: str | None = None,
    ) -> None:
        await self.pool.execute(
            """UPDATE content_runs
               SET status = $2, spent_usd = $3, theme = COALESCE($4, theme),
                   plan = COALESCE($5::jsonb, plan), error = $6, finished_at = now()
               WHERE id = $1""",
            run_id, status, spent_usd, theme, json.dumps(plan) if plan else None, error,
        )

    async def record_calls(self, run_id: uuid.UUID, calls: list[CallRecord]) -> None:
        if not calls:
            return
        await self.pool.executemany(
            """INSERT INTO model_calls
               (id, run_id, post_id, role, model, input_tokens, output_tokens,
                cost_usd, latency_ms, succeeded, error)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
            [
                (uuid.uuid4(), run_id, c.post_id, c.role, c.model, c.input_tokens, c.output_tokens,
                 c.cost_usd, c.latency_ms, c.succeeded, c.error)
                for c in calls
            ],
        )

    # --- posts ----------------------------------------------------------------

    async def insert_post(self, run_id: uuid.UUID, post: dict[str, Any]) -> None:
        brief, draft = post["brief"], post["draft"]
        review = post.get("review") or {}
        await self.pool.execute(
            """INSERT INTO content_posts
               (id, run_id, platform, pillar, format, audience, angle, discovery_question,
                cta_kind, explore, hook, body, slides, visual_brief, alt_text, hashtags,
                cta_text, initial_writer_model, writer_model, critic_model, router_reason,
                revision_count, mom_test_score, premium_score, platform_fit_score,
                review_notes, generation_cost_usd, status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,
                       $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28)""",
            post["post_id"], run_id, brief["platform"], brief["pillar"], brief["format"],
            brief["audience"], brief["angle"], brief["discovery_question"], brief["cta"],
            brief["explore"], draft["hook"], draft["body"], json.dumps(draft["slides"]),
            draft["visual_brief"], draft["alt_text"], draft["hashtags"], draft["cta_text"],
            post["initial_writer_model"], post["writer_model"], post.get("critic_model"),
            post.get("router_reason"), post["revisions"], review.get("mom_test_score"),
            review.get("premium_score"), review.get("platform_fit_score"),
            json.dumps(post.get("notes", [])), post["cost_usd"], post["status"],
        )

    async def recent_hooks(self, limit: int = 40) -> list[str]:
        rows = await self.pool.fetch(
            "SELECT platform, hook FROM content_posts ORDER BY created_at DESC LIMIT $1", limit
        )
        return [f"{r['platform']}: {r['hook']}" for r in rows]

    async def posts_for_review(self) -> list[asyncpg.Record]:
        return await self.pool.fetch(
            """SELECT * FROM content_posts WHERE status IN ('draft', 'needs_human')
               ORDER BY status DESC, platform, created_at"""
        )

    async def approved_posts(self, week_of: date | None) -> list[asyncpg.Record]:
        return await self.pool.fetch(
            """SELECT p.* FROM content_posts p JOIN content_runs r ON r.id = p.run_id
               WHERE p.status = 'approved' AND ($1::date IS NULL OR r.week_of = $1)
               ORDER BY p.platform, p.created_at""",
            week_of,
        )

    async def posts_to_render(self, week_of: date | None, include_unreviewed: bool = False) -> list[asyncpg.Record]:
        """Posts with their run's week, for image rendering. Approved only unless include_unreviewed."""
        statuses = ["approved", "draft", "needs_human"] if include_unreviewed else ["approved"]
        return await self.pool.fetch(
            """SELECT p.*, r.week_of FROM content_posts p JOIN content_runs r ON r.id = p.run_id
               WHERE p.status = ANY($2::text[]) AND ($1::date IS NULL OR r.week_of = $1)
               ORDER BY r.week_of, p.platform, p.created_at""",
            week_of, statuses,
        )

    async def resolve_post_id(self, prefix: str) -> uuid.UUID:
        rows = await self.pool.fetch(
            "SELECT id FROM content_posts WHERE id::text LIKE $1 || '%' LIMIT 2", prefix.lower()
        )
        if len(rows) != 1:
            raise ValueError(f"Post id prefix {prefix!r} matched {len(rows)} posts; use more characters.")
        return rows[0]["id"]

    async def set_review(
        self, post_id: uuid.UUID, status: str, note: str | None = None,
        body: str | None = None, hook: str | None = None,
    ) -> None:
        await self.pool.execute(
            """UPDATE content_posts
               SET status = $2, reviewer_note = COALESCE($3, reviewer_note),
                   body = COALESCE($4, body), hook = COALESCE($5, hook),
                   human_edited = human_edited OR $4 IS NOT NULL OR $5 IS NOT NULL,
                   reviewed_at = now()
               WHERE id = $1""",
            post_id, status, note, body, hook,
        )

    async def mark_published(self, post_id: uuid.UUID, url: str | None) -> None:
        await self.pool.execute(
            "UPDATE content_posts SET status = 'published', post_url = $2, published_at = now() WHERE id = $1",
            post_id, url,
        )

    # --- feedback loop --------------------------------------------------------

    async def record_signals(self, post_id: uuid.UUID, metrics: dict[str, int]) -> None:
        columns = ["impressions", "likes", "comments", "meaningful_comments", "shares",
                   "saves", "link_clicks", "dms_with_story", "signups"]
        await self.pool.execute(
            f"""INSERT INTO post_signals (id, post_id, {", ".join(columns)})
                VALUES ($1, $2, {", ".join(f"${i}" for i in range(3, 3 + len(columns)))})""",
            uuid.uuid4(), post_id, *[int(metrics.get(c, 0)) for c in columns],
        )

    async def record_story(self, story: dict[str, Any]) -> None:
        await self.pool.execute(
            """INSERT INTO discovery_stories
               (id, post_id, platform, role, sector, incident, current_workaround,
                cost_of_problem, consent_to_paraphrase)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            uuid.uuid4(), story.get("post_id"), story.get("platform"), story["role"], story["sector"],
            story["incident"], story.get("current_workaround"), story.get("cost_of_problem"),
            story.get("consent_to_paraphrase", False),
        )

    async def consented_stories(self, limit: int = 8) -> list[str]:
        rows = await self.pool.fetch(
            """SELECT role, sector, incident, current_workaround FROM discovery_stories
               WHERE consent_to_paraphrase ORDER BY recorded_at DESC LIMIT $1""",
            limit,
        )
        return [
            f"{r['role']} ({r['sector']}): {r['incident']}"
            + (f" Workaround today: {r['current_workaround']}" if r["current_workaround"] else "")
            for r in rows
        ]

    async def story_themes(self, limit: int = 20) -> list[str]:
        """All stories, consented or not, reduced to role/sector/problem for planning only."""
        rows = await self.pool.fetch(
            "SELECT role, sector, incident FROM discovery_stories ORDER BY recorded_at DESC LIMIT $1", limit
        )
        return [f"{r['role']} in {r['sector']}: {r['incident'][:160]}" for r in rows]

    async def model_stats(self, days: int = 120) -> dict[str, ModelStats]:
        rows = await self.pool.fetch(
            """SELECT p.initial_writer_model AS model,
                      COUNT(*) AS posts,
                      AVG(CASE WHEN p.revision_count = 0 AND p.status <> 'needs_human'
                               THEN 1.0 ELSE 0.0 END) AS first_pass_rate,
                      COUNT(*) FILTER (WHERE p.status IN ('approved','rejected','published')) AS reviewed,
                      AVG(CASE WHEN p.status IN ('approved','published') THEN 1.0
                               WHEN p.status = 'rejected' THEN 0.0 END) AS approval_rate,
                      AVG(pp.signal_index) AS signal_index,
                      COUNT(pp.id) AS measured,
                      AVG(p.generation_cost_usd) AS avg_cost
               FROM content_posts p
               LEFT JOIN post_performance pp ON pp.id = p.id
               WHERE p.created_at > now() - make_interval(days => $1)
               GROUP BY p.initial_writer_model""",
            days,
        )
        return {
            r["model"]: ModelStats(
                model=r["model"], posts=r["posts"],
                first_pass_rate=float(r["first_pass_rate"]) if r["first_pass_rate"] is not None else None,
                approval_rate=float(r["approval_rate"]) if r["approval_rate"] is not None else None,
                reviewed=r["reviewed"],
                signal_index=float(r["signal_index"]) if r["signal_index"] is not None else None,
                measured=r["measured"],
                avg_cost_usd=float(r["avg_cost"]) if r["avg_cost"] is not None else None,
            )
            for r in rows
        }

    async def pillar_performance(self, days: int = 120) -> list[asyncpg.Record]:
        return await self.pool.fetch(
            """SELECT p.platform, p.pillar, COUNT(*) AS posts, COUNT(pp.id) AS measured,
                      ROUND(AVG(pp.signal_index)::numeric, 2) AS signal_index,
                      COALESCE(SUM(ps.signups), 0) AS signups,
                      COALESCE(SUM(ps.dms_with_story), 0) AS story_dms
               FROM content_posts p
               LEFT JOIN post_performance pp ON pp.id = p.id
               LEFT JOIN LATERAL (
                   SELECT signups, dms_with_story FROM post_signals s
                   WHERE s.post_id = p.id ORDER BY recorded_at DESC LIMIT 1
               ) ps ON true
               WHERE p.created_at > now() - make_interval(days => $1)
                 AND p.status IN ('approved', 'published')
               GROUP BY p.platform, p.pillar
               ORDER BY p.platform, signal_index DESC NULLS LAST""",
            days,
        )

    async def recent_runs(self, limit: int = 8) -> list[asyncpg.Record]:
        return await self.pool.fetch(
            """SELECT r.week_of, r.status, r.theme, r.budget_usd, r.spent_usd,
                      COUNT(p.id) AS posts
               FROM content_runs r LEFT JOIN content_posts p ON p.run_id = r.id
               GROUP BY r.id ORDER BY r.started_at DESC LIMIT $1""",
            limit,
        )
