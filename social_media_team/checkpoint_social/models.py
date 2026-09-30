"""Typed contracts passed between agents and the workflow."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Platform = Literal["linkedin", "facebook", "instagram", "x"]
Pillar = Literal[
    "page_everyone_reads",
    "tuesday_test",
    "every_visitor",
    "what_we_wont_claim",
    "proof_not_promises",
]
PostFormat = Literal["text", "carousel", "reel_script", "thread", "poll", "image_single"]
CtaKind = Literal["create_account", "see_pricing", "question_only"]


class PostBrief(BaseModel):
    platform: Platform
    pillar: Pillar
    format: PostFormat
    audience: str = Field(description="Specific reader, e.g. 'branch manager at a Windhoek bank'.")
    angle: str = Field(description="The one idea this post lands, in one sentence.")
    discovery_question: str = Field(
        description="A question about a specific PAST event in the reader's life. Never hypothetical."
    )
    cta: CtaKind
    explore: bool = Field(description="True if this post tests an under-used pillar, format or angle.")


class WeekPlan(BaseModel):
    theme: str
    rationale: str = Field(description="Why this mix, referencing last weeks' performance where available.")
    briefs: list[PostBrief]


class PostDraft(BaseModel):
    hook: str = Field(description="First line the reader sees.")
    body: str = Field(description="Full post text after the hook, ready to paste.")
    slides: list[str] = Field(
        default_factory=list,
        description="Carousel slide copy, reel shot list, or thread tweets. Empty for plain text posts.",
    )
    visual_brief: str = Field(description="Instructions for the designer using the brand visual system.")
    alt_text: str = Field(description="Accessible description of the visual.")
    hashtags: list[str] = Field(default_factory=list)
    cta_text: str = Field(description="The closing call to action exactly as it should appear.")


class CriticReview(BaseModel):
    mom_test_score: int = Field(ge=0, le=10)
    premium_score: int = Field(ge=0, le=10, description="Calm, precise, confident, not salesy.")
    platform_fit_score: int = Field(ge=0, le=10)
    claim_violations: list[str] = Field(
        default_factory=list, description="Any breach of the claim rules, quoted. Empty if none."
    )
    issues: list[str] = Field(default_factory=list, description="Concrete, fixable problems.")
    rewrite_guidance: str = Field(description="Specific instructions for the next revision, or 'none'.")
