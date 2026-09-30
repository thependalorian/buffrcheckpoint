"""Deterministic guardrails.

These run before the LLM critic and cost nothing. They catch the claims that
would damage credibility with regulated buyers, so a model can never talk its
way past them.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .models import PostBrief, PostDraft
from .strategy import (
    ALLOWED_DOMAINS,
    APPROVED_AMOUNTS,
    APPROVED_PERCENTAGES,
    CHARACTER_LIMITS,
    HASHTAG_LIMITS,
)


@dataclass(frozen=True)
class Violation:
    code: str
    message: str
    excerpt: str = ""

    def render(self) -> str:
        return f"[{self.code}] {self.message}" + (f' ("{self.excerpt}")' if self.excerpt else "")


_I = re.IGNORECASE

CLAIM_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    # Not negatable: DigiNam, NPKI and the national e-ID are off all marketing copy,
    # including "we won't claim" posts.
    ("banned_topic", re.compile(r"\bdiginam\b|\bnpki\b|\be-?id\b|\bnational\s+id\s+card\b", _I),
     "DigiNam, NPKI and the national e-ID are not mentioned in marketing copy at all."),
    ("compliance_overclaim", re.compile(r"\b(make|makes|making|keep|keeps) (you|your \w+) compliant", _I),
     "Never promise compliance. Say the product supports controls."),
    ("compliance_overclaim", re.compile(r"\b(psd-?12|popia|gdpr|fully)[\s-]+compliant", _I),
     "Compliance certification claim."),
    ("compliance_overclaim", re.compile(r"guarantee[sd]?\s+(\w+\s+)?compliance", _I),
     "Guaranteed compliance claim."),
    ("hosting_claim", re.compile(r"(hosted|stored|stays|kept)\s+(\w+\s+){0,2}in namibia|namibian data ?cent(re|er)", _I),
     "Data location claim. Say nothing about hosting location."),
    ("signature_overclaim", re.compile(r"legally[\s-]binding", _I),
     "Legal signature overclaim. Acknowledgements are audit evidence."),
    ("channel_overclaim", re.compile(r"\b(ussd|sms)\b[^.\n]{0,60}\b(live|available now|now available|included|today|launch(ed)?)\b", _I),
     "USSD/SMS presented as live."),
    ("channel_overclaim", re.compile(r"\b(live|available now|now available|included)\b[^.\n]{0,40}\b(ussd|sms)\b", _I),
     "USSD/SMS presented as live."),
    # Whole word only: buffrcheckpoint.com links still pass.
    ("brand_linkage", re.compile(r"\bbuffr\b", _I),
     "Say 'Checkpoint'. The Buffr name appears only in profile bios, never in a post."),
    ("mom_test_hypothetical", re.compile(r"\bwould you (use|buy|pay|like|want|try|consider)\b", _I),
     "Hypothetical question. Ask about a specific past event instead."),
    ("mom_test_hypothetical", re.compile(r"wouldn'?t it be (great|nice|amazing)|imagine if", _I),
     "Hypothetical framing. Ask about a specific past event instead."),
    ("mom_test_fishing", re.compile(r"(don'?t you (agree|think)|agree\?|smash (that|the) like|like if you)", _I),
     "Fishing for agreement or likes."),
]

DASH_PATTERN = re.compile(r"\u2014|\s\u2013\s")
AMOUNT_PATTERN = re.compile(r"N\$\s?\d[\d,]*(?:\.\d+)?")
PERCENT_PATTERN = re.compile(r"\d+(?:\.\d+)?\s?%|\d+(?:\.\d+)?\s?percent", _I)
DOMAIN_PATTERN = re.compile(r"(?:https?://)?((?:[a-z0-9-]+\.)+(?:com|na|org|io|net|co\.za))\b", _I)

IMAGERY_PATTERN = re.compile(
    r"stock photo|business team|surveillance|cctv|padlock|shield|hacker|facial recognition|lock icon", _I
)
# Model output that leaked JSON or produced a file-extension URL (e.g. /auth/register.png).
MALFORMED_PATTERN = re.compile(
    r"buffrcheckpoint\.com/[^\s]*\.(png|jpe?g|gif|svg|webp)\b|['\"]\s*,\s*['\"]?\w+['\"]?\s*:\s*\[|[.,;:]\s*,\s*$|\\\"",
    re.IGNORECASE | re.MULTILINE,
)
# These exports carry the retired "buffr checkpoint" wordmark.
RETIRED_ASSET_PATTERN = re.compile(r"logo-horizontal|logo-stacked|wordmark|og-1200x630", _I)


NEGATION_PATTERN = re.compile(
    r"\b(won'?t|will not|never|don'?t|do not|doesn'?t|does not|not|no one|nobody|isn'?t|aren'?t|red flag|beware)\b", _I
)
NEGATABLE = {"compliance_overclaim", "hosting_claim", "signature_overclaim", "channel_overclaim"}


SENTENCE_END = re.compile(r"[.!?](?=\s)|\n")


def _negated(text: str, match: re.Match[str]) -> bool:
    """True when the claim is being rejected, e.g. "we won't tell you we make you compliant".

    A sentence ends at ". ", "! ", "? " or a newline, so file names like logo-horizontal.png
    and domains like buffrcheckpoint.com do not split a sentence.
    """
    ends = [m.end() for m in SENTENCE_END.finditer(text, 0, match.start())]
    sentence_start = ends[-1] if ends else 0
    return bool(NEGATION_PATTERN.search(text[sentence_start : match.start()]))


def _excerpt(text: str, match: re.Match[str], width: int = 40) -> str:
    start = max(0, match.start() - width)
    return text[start : match.end() + width].replace("\n", " ").strip()


def post_text(draft: PostDraft) -> str:
    return "\n".join([draft.hook, draft.body, *draft.slides, draft.cta_text, " ".join(draft.hashtags)])


def check_draft(brief: PostBrief, draft: PostDraft) -> list[Violation]:
    text = post_text(draft)
    found: list[Violation] = []

    for code, pattern, message in CLAIM_PATTERNS:
        for match in pattern.finditer(text):
            if code in NEGATABLE and _negated(text, match):
                continue
            found.append(Violation(code, message, _excerpt(text, match)))

    if DASH_PATTERN.search(text):
        found.append(Violation("house_style", "Remove em/en dashes used as sentence connectors."))

    for match in AMOUNT_PATTERN.finditer(text):
        amount = match.group(0).replace(" ", "")
        if amount not in APPROVED_AMOUNTS:
            found.append(Violation("unapproved_number", "Price not in the approved facts list.", amount))

    for match in PERCENT_PATTERN.finditer(text):
        if match.group(0).replace(" ", "").lower() not in APPROVED_PERCENTAGES:
            found.append(Violation("unapproved_number", "Statistic not in the approved facts list.", match.group(0)))

    for match in DOMAIN_PATTERN.finditer(text):
        if match.group(1).lower() not in ALLOWED_DOMAINS:
            found.append(Violation("unapproved_link", "Only buffrcheckpoint.com domains may be linked.", match.group(1)))

    if IMAGERY_PATTERN.search(draft.visual_brief):
        found.append(Violation("imagery", "Visual brief uses banned imagery."))

    for match in RETIRED_ASSET_PATTERN.finditer(draft.visual_brief):
        # "Do not use logo-horizontal.png" is the instruction we want, not a violation.
        if not _negated(draft.visual_brief, match):
            found.append(Violation("imagery", "Visual brief uses a retired logo file. Use icon-512.png with the word Checkpoint."))
            break

    for match in MALFORMED_PATTERN.finditer(text):
        found.append(Violation("malformed", "Broken link or leaked JSON in the copy.", _excerpt(text, match)))

    limit = HASHTAG_LIMITS[brief.platform]
    if len(draft.hashtags) > limit:
        found.append(Violation("platform_limit", f"{len(draft.hashtags)} hashtags; {brief.platform} allows {limit}."))

    char_limit = CHARACTER_LIMITS[brief.platform]
    if brief.platform == "x":
        if brief.format == "thread":
            if not 3 <= len(draft.slides) <= 5:
                found.append(Violation("platform_limit", "X threads need 3 to 5 tweets in slides."))
            for index, tweet in enumerate(draft.slides, start=1):
                if len(tweet) > char_limit:
                    found.append(Violation("platform_limit", f"Tweet {index} is {len(tweet)} characters."))
        else:
            single = f"{draft.hook}\n\n{draft.body}\n{draft.cta_text}".strip()
            if len(single) > char_limit:
                found.append(Violation("platform_limit", f"X post is {len(single)} characters; limit is 280."))
    elif len(f"{draft.hook}\n\n{draft.body}\n\n{draft.cta_text}") > char_limit:
        found.append(Violation("platform_limit", f"Post exceeds {char_limit} characters for {brief.platform}."))

    if brief.format in {"carousel", "reel_script"} and len(draft.slides) < 3:
        found.append(Violation("format", f"{brief.format} needs at least 3 slides or shots."))

    return found
