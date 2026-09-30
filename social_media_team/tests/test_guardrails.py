"""Guardrail rules that encode the 2026-09-29 product decisions.

Run from social_media_team/:  python -m pytest -q tests
"""

from checkpoint_social.guardrails import check_draft
from checkpoint_social.models import PostBrief, PostDraft

BRIEF = PostBrief(
    platform="linkedin",
    pillar="what_we_wont_claim",
    format="text",
    audience="compliance officer at a Windhoek bank",
    angle="What a visitor record should prove.",
    discovery_question="When did an auditor last ask who was on site on a given day?",
    cta="see_pricing",
    explore=False,
)


def draft(text: str = "", visual: str = "Icon with the word Checkpoint on light ground.") -> PostDraft:
    return PostDraft(
        hook="Your last visitor read every line above theirs.",
        body=text or "Checkpoint gives each visitor a private record.",
        visual_brief=visual,
        alt_text="Checkpoint icon.",
        cta_text="See pricing at buffrcheckpoint.com/pricing",
    )


def codes(d: PostDraft) -> set[str]:
    return {v.code for v in check_draft(BRIEF, d)}


def test_clean_post_passes():
    assert codes(draft()) == set()


def test_diginam_blocked_even_when_negated():
    assert "banned_topic" in codes(draft("We will not claim DigiNam is live."))
    assert "banned_topic" in codes(draft("Built for NPKI verification."))
    assert "banned_topic" in codes(draft("No visitor taps a national e-ID here."))


def test_buffr_word_blocked_but_domain_allowed():
    assert "brand_linkage" in codes(draft("Buffr Checkpoint keeps records private."))
    assert "brand_linkage" in codes(draft("Checkpoint by Buffr keeps records private."))
    assert "brand_linkage" not in codes(draft("Create an account at admin.buffrcheckpoint.com."))


def test_retired_logo_files_blocked_in_visual_brief():
    assert "imagery" in codes(draft(visual="Use logo-horizontal.png top left."))
    assert "imagery" in codes(draft(visual="Place og-1200x630.png as the background."))
    assert "imagery" not in codes(draft(visual="Use icon-512.png with the word Checkpoint."))


def test_negated_compliance_claim_still_allowed():
    assert "compliance_overclaim" not in codes(draft("We won't tell you we make you compliant."))
    assert "compliance_overclaim" in codes(draft("We make you compliant in a day."))


def test_approved_prices_only():
    assert "unapproved_number" not in codes(draft("Site costs N$1,500 a month."))
    assert "unapproved_number" in codes(draft("Plans from N$1,200 a month."))


def test_do_not_use_instruction_is_not_a_violation():
    brief = "Icon with the word Checkpoint. Do not use logo-horizontal.png, logo-stacked.png or og-1200x630.png."
    assert "imagery" not in codes(draft(visual=brief))


def test_malformed_output_blocked():
    assert "malformed" in codes(draft("Create account: https://admin.buffrcheckpoint.com/auth/register.png link."))
    assert "malformed" in codes(draft("See pricing at https://buffrcheckpoint.com/pricing.','hashtags\":["))
    assert "malformed" in codes(draft("Reply with what happened.,"))
    assert "malformed" not in codes(draft("See pricing at https://buffrcheckpoint.com/pricing."))
