-- Buffr Checkpoint social content system: Neon Postgres schema.
-- Idempotent: safe to re-run with `python -m checkpoint_social init-db`.

CREATE TABLE IF NOT EXISTS content_runs (
    id            UUID PRIMARY KEY,
    week_of       DATE NOT NULL,
    budget_usd    NUMERIC(10, 4) NOT NULL,
    spent_usd     NUMERIC(10, 6) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'running',   -- running | completed | failed
    theme         TEXT,
    plan          JSONB,
    error         TEXT,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_posts (
    id                    UUID PRIMARY KEY,
    run_id                UUID NOT NULL REFERENCES content_runs(id),
    platform              TEXT NOT NULL,
    pillar                TEXT NOT NULL,
    format                TEXT NOT NULL,
    audience              TEXT NOT NULL,
    angle                 TEXT NOT NULL,
    discovery_question    TEXT NOT NULL,
    cta_kind              TEXT NOT NULL,
    explore               BOOLEAN NOT NULL DEFAULT false,
    hook                  TEXT NOT NULL,
    body                  TEXT NOT NULL,
    slides                JSONB NOT NULL DEFAULT '[]'::jsonb,
    visual_brief          TEXT NOT NULL,
    alt_text              TEXT NOT NULL,
    hashtags              TEXT[] NOT NULL DEFAULT '{}',
    cta_text              TEXT NOT NULL,
    initial_writer_model  TEXT NOT NULL,
    writer_model          TEXT NOT NULL,
    critic_model          TEXT,
    router_reason         TEXT,
    revision_count        INT NOT NULL DEFAULT 0,
    mom_test_score        INT,
    premium_score         INT,
    platform_fit_score    INT,
    review_notes          JSONB NOT NULL DEFAULT '[]'::jsonb,
    generation_cost_usd   NUMERIC(10, 6) NOT NULL DEFAULT 0,
    status                TEXT NOT NULL,   -- draft | needs_human | approved | rejected | published
    human_edited          BOOLEAN NOT NULL DEFAULT false,
    reviewer_note         TEXT,
    post_url              TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMPTZ,
    published_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_posts_run ON content_posts (run_id);

-- Every LLM call, for cost accounting and model comparison.
CREATE TABLE IF NOT EXISTS model_calls (
    id             UUID PRIMARY KEY,
    run_id         UUID NOT NULL REFERENCES content_runs(id),
    post_id        UUID,          -- null for planner calls; not FK so failed drafts stay traceable
    role           TEXT NOT NULL, -- planner | writer | critic
    model          TEXT NOT NULL,
    input_tokens   INT NOT NULL DEFAULT 0,
    output_tokens  INT NOT NULL DEFAULT 0,
    cost_usd       NUMERIC(10, 6) NOT NULL DEFAULT 0,
    latency_ms     INT NOT NULL DEFAULT 0,
    succeeded      BOOLEAN NOT NULL,
    error          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_calls_model ON model_calls (model, created_at DESC);

-- Snapshot of real-world results. Record once a few days after posting.
CREATE TABLE IF NOT EXISTS post_signals (
    id                   UUID PRIMARY KEY,
    post_id              UUID NOT NULL REFERENCES content_posts(id),
    impressions          INT NOT NULL DEFAULT 0,
    likes                INT NOT NULL DEFAULT 0,
    comments             INT NOT NULL DEFAULT 0,
    meaningful_comments  INT NOT NULL DEFAULT 0,  -- comments describing a real situation
    shares               INT NOT NULL DEFAULT 0,
    saves                INT NOT NULL DEFAULT 0,
    link_clicks          INT NOT NULL DEFAULT 0,
    dms_with_story       INT NOT NULL DEFAULT 0,  -- DMs describing a specific past incident
    signups              INT NOT NULL DEFAULT 0,  -- accounts created, attributed to this post
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_signals_post ON post_signals (post_id, recorded_at DESC);

-- The Mom Test log: real stories from comments, DMs and calls.
CREATE TABLE IF NOT EXISTS discovery_stories (
    id                     UUID PRIMARY KEY,
    post_id                UUID REFERENCES content_posts(id),
    platform               TEXT,
    role                   TEXT NOT NULL,     -- e.g. branch manager
    sector                 TEXT NOT NULL,     -- e.g. banking, clinic, government
    incident               TEXT NOT NULL,     -- what actually happened, anonymised
    current_workaround     TEXT,
    cost_of_problem        TEXT,
    consent_to_paraphrase  BOOLEAN NOT NULL DEFAULT false,
    recorded_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mom Test weighting: commitment and real stories count, likes barely do.
-- Single source of truth for signal weights.
CREATE OR REPLACE VIEW post_performance AS
WITH latest AS (
    SELECT DISTINCT ON (post_id) *
    FROM post_signals
    ORDER BY post_id, recorded_at DESC
),
scored AS (
    SELECT
        p.id, p.platform, p.pillar, p.format, p.initial_writer_model, p.writer_model,
        (l.signups * 10.0
         + l.dms_with_story * 8.0
         + l.meaningful_comments * 3.0
         + l.shares * 1.5
         + l.saves * 1.0
         + l.link_clicks * 1.0
         + l.likes * 0.1) AS signal_score
    FROM content_posts p
    JOIN latest l ON l.post_id = p.id
)
SELECT
    s.*,
    COALESCE(s.signal_score / NULLIF(AVG(s.signal_score) OVER (PARTITION BY s.platform), 0), 0)
        AS signal_index
FROM scored s;
