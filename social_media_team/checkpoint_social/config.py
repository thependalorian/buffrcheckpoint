"""Runtime settings, model roster and pricing.

Everything that changes week to week lives in environment variables so the
code never needs editing to swap a model, a price or the budget.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class ModelPrice:
    """USD per million tokens."""

    input_per_mtok: float
    output_per_mtok: float

    def cost(self, input_tokens: int, output_tokens: int) -> float:
        return (input_tokens * self.input_per_mtok + output_tokens * self.output_per_mtok) / 1_000_000


# Haiku 4.5 is Anthropic's published rate. The 5.5 rates follow Anthropic's
# long-standing Sonnet/Opus tier pricing but are NOT verified here: confirm
# them at https://claude.com/pricing and override with MODEL_PRICES_JSON.
DEFAULT_PRICES: dict[str, ModelPrice] = {
    "anthropic:claude-haiku-4-5-20251001": ModelPrice(1.00, 5.00),
    "anthropic:claude-sonnet-5-5": ModelPrice(3.00, 15.00),
    "anthropic:claude-opus-5-5": ModelPrice(5.00, 25.00),
}

# Rough per-call token footprint, used only until real averages exist in Neon.
ESTIMATED_TOKENS = {
    "planner": (6_000, 2_500),
    "writer": (4_500, 1_200),
    "critic": (4_000, 500),
    "illustrator": (2_500, 3_500),
}


def _csv(name: str, default: str) -> tuple[str, ...]:
    raw = os.getenv(name, default)
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _prices() -> dict[str, ModelPrice]:
    prices = dict(DEFAULT_PRICES)
    override = os.getenv("MODEL_PRICES_JSON", "").strip()
    if override:
        for model, pair in json.loads(override).items():
            prices[model] = ModelPrice(float(pair[0]), float(pair[1]))
    return prices


def neon_dsn(url: str) -> str:
    """asyncpg forwards unknown query params to Postgres as settings.

    Neon connection strings carry `channel_binding=require`, which Postgres
    rejects as an unknown setting, so strip it and keep everything else.
    """
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "channel_binding"]
    return urlunsplit(parts._replace(query=urlencode(query)))


@dataclass
class Settings:
    database_url: str
    planner_model: str
    writer_models: tuple[str, ...]  # ordered cheapest -> strongest
    critic_models: tuple[str, ...]  # cascade: cheap first, escalate when borderline
    illustrator_models: tuple[str, ...] = ()  # SVG illustrations: cheap first, one stronger retry
    render_budget_usd: float = 1.0  # per `render` run, separate from the weekly writing budget
    prices: dict[str, ModelPrice] = field(default_factory=_prices)
    weekly_budget_usd: float = 3.0
    max_revisions: int = 2
    exploration_rate: float = 0.15
    concurrency: int = 3
    output_dir: Path = Path("out")

    def price(self, model: str) -> ModelPrice:
        try:
            return self.prices[model]
        except KeyError as exc:
            raise KeyError(
                f"No price configured for {model!r}. Add it to MODEL_PRICES_JSON "
                'as {"' + model + '": [input_per_mtok, output_per_mtok]}.'
            ) from exc

    def estimate(self, model: str, role: str) -> float:
        tokens_in, tokens_out = ESTIMATED_TOKENS[role]
        return self.price(model).cost(tokens_in, tokens_out)

    def validate(self) -> None:
        if not self.database_url:
            raise ValueError("Set SOCIAL_DATABASE_URL (or DATABASE_URL) to your Neon connection string.")
        if not self.writer_models or not self.critic_models:
            raise ValueError("SOCIAL_WRITER_MODELS and SOCIAL_CRITIC_MODELS need at least one model each.")
        for model in (self.planner_model, *self.writer_models, *self.critic_models, *self.illustrator_models):
            self.price(model)
        if self.weekly_budget_usd <= 0:
            raise ValueError("SOCIAL_WEEKLY_BUDGET_USD must be positive.")


def load_settings() -> Settings:
    return Settings(
        database_url=neon_dsn(os.getenv("SOCIAL_DATABASE_URL") or os.getenv("DATABASE_URL", "")),
        planner_model=os.getenv("SOCIAL_PLANNER_MODEL", "anthropic:claude-sonnet-5-5"),
        writer_models=_csv(
            "SOCIAL_WRITER_MODELS",
            "anthropic:claude-haiku-4-5-20251001,anthropic:claude-sonnet-5-5,anthropic:claude-opus-5-5",
        ),
        critic_models=_csv(
            "SOCIAL_CRITIC_MODELS",
            "anthropic:claude-haiku-4-5-20251001,anthropic:claude-sonnet-5-5",
        ),
        illustrator_models=_csv(
            "SOCIAL_ILLUSTRATOR_MODELS",
            "anthropic:claude-haiku-4-5-20251001,anthropic:claude-sonnet-5-5",
        ),
        render_budget_usd=float(os.getenv("SOCIAL_RENDER_BUDGET_USD", "1.00")),
        weekly_budget_usd=float(os.getenv("SOCIAL_WEEKLY_BUDGET_USD", "3.00")),
        max_revisions=int(os.getenv("SOCIAL_MAX_REVISIONS", "2")),
        exploration_rate=float(os.getenv("SOCIAL_EXPLORATION_RATE", "0.15")),
        concurrency=int(os.getenv("SOCIAL_CONCURRENCY", "3")),
        output_dir=Path(os.getenv("SOCIAL_OUTPUT_DIR", "out")),
    )
