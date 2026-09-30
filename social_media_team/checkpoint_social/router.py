"""Pick the writer model for each post.

Quality per dollar decides, learned from Neon history:
- first-pass rate: drafts that cleared guardrails and critic without revision
- approval rate: drafts you approved in review
- signal index: real-world results (signups, story DMs, meaningful comments),
  normalised per platform so LinkedIn and X are comparable

Until a model has enough history, priors stand in so new models still get
tried. A fixed share of picks explores, so a cheaper model can prove itself.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from .config import Settings

PRIOR_FIRST_PASS = 0.6
PRIOR_APPROVAL = 0.7
PRIOR_SIGNAL_INDEX = 1.0
MIN_SAMPLES = 5  # below this many posts, blend towards the prior
COST_SENSITIVITY = 0.5  # 0 ignores cost, 1 is pure quality-per-dollar


@dataclass(frozen=True)
class ModelStats:
    model: str
    posts: int = 0
    first_pass_rate: float | None = None
    approval_rate: float | None = None
    reviewed: int = 0
    signal_index: float | None = None
    measured: int = 0
    avg_cost_usd: float | None = None


def _blend(observed: float | None, samples: int, prior: float) -> float:
    if observed is None or samples <= 0:
        return prior
    weight = min(1.0, samples / MIN_SAMPLES)
    return weight * observed + (1 - weight) * prior


def quality(stats: ModelStats) -> float:
    first_pass = _blend(stats.first_pass_rate, stats.posts, PRIOR_FIRST_PASS)
    approval = _blend(stats.approval_rate, stats.reviewed, PRIOR_APPROVAL)
    signal = _blend(stats.signal_index, stats.measured, PRIOR_SIGNAL_INDEX)
    # Real-world signal matters most once it exists; generation quality carries cold start.
    signal_weight = 0.5 * min(1.0, stats.measured / MIN_SAMPLES)
    craft = 0.5 * first_pass + 0.5 * approval
    return (1 - signal_weight) * craft + signal_weight * min(signal, 3.0) / 1.5


def expected_cost(settings: Settings, stats: ModelStats) -> float:
    if stats.avg_cost_usd and stats.posts >= MIN_SAMPLES:
        return stats.avg_cost_usd
    # A post is one draft plus, on average, some revisions and critic passes.
    return settings.estimate(stats.model, "writer") * 1.5


def score(settings: Settings, stats: ModelStats) -> float:
    return quality(stats) / (expected_cost(settings, stats) ** COST_SENSITIVITY)


@dataclass(frozen=True)
class Choice:
    model: str
    reason: str


def choose_writer(
    settings: Settings,
    stats_by_model: dict[str, ModelStats],
    remaining_budget: float,
    posts_remaining: int,
    rng: random.Random,
) -> Choice:
    candidates = [stats_by_model.get(m, ModelStats(model=m)) for m in settings.writer_models]
    per_post_allowance = remaining_budget / max(1, posts_remaining)
    affordable = [c for c in candidates if expected_cost(settings, c) <= per_post_allowance]

    if not affordable:
        cheapest = min(candidates, key=lambda c: expected_cost(settings, c))
        return Choice(cheapest.model, f"budget: only ${per_post_allowance:.3f}/post left, using cheapest")

    if len(affordable) > 1 and rng.random() < settings.exploration_rate:
        pick = rng.choice(affordable)
        return Choice(pick.model, "explore")

    best = max(affordable, key=lambda c: score(settings, c))
    return Choice(best.model, f"exploit: quality {quality(best):.2f}, est ${expected_cost(settings, best):.3f}/post")


def stronger(settings: Settings, model: str) -> str | None:
    """Next tier up for escalation after repeated guardrail failures."""
    tiers = list(settings.writer_models)
    if model not in tiers:
        return None
    index = tiers.index(model)
    return tiers[index + 1] if index + 1 < len(tiers) else None
