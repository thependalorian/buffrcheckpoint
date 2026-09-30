"""Illustrator role: Claude writes an SVG illustration from a post's visual brief.

The model never writes words into the image. Templates own all text, so there is
no garbled or invented copy. Every SVG is validated before it is rendered:
it must parse, use only palette colours plus greys, and contain no text, images,
scripts, external links or app/browser chrome. A failure is regenerated once with
the next model up, then the post falls back to a plain brand card.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from defusedxml import ElementTree as SafeET
from pydantic import BaseModel, Field
from pydantic_ai import Agent, NativeOutput
from pydantic_ai.settings import ModelSettings

from .agents import AGENT_FACTORIES, BudgetExceeded, CostLedger, ModelRef, ModelResolver, run_metered
from .config import Settings

PALETTE = {"e0b000", "111111", "f5f5f5"}
COLOUR_ATTRS = {"fill", "stroke", "stop-color", "color", "flood-color", "lighting-color"}
FORBIDDEN_TAGS = {"script", "image", "text", "tspan", "textpath", "foreignobject", "a", "iframe",
                  "video", "audio", "style", "font", "font-face"}
NAMED_OK = {"none", "transparent", "currentcolor", "white", "black", "inherit"}
CHROME_WORDS = re.compile(r"browser|window|toolbar|titlebar|navbar|statusbar|tab-?bar|button|phone|notch|app-?frame", re.I)
MAX_SVG_CHARS = 40_000


class Illustration(BaseModel):
    svg: str = Field(description="One complete <svg> element. No text, images, scripts or external links.")
    description: str = Field(description="One sentence saying what the illustration shows, for the manifest.")


ILLUSTRATOR_INSTRUCTIONS = """\
You are the illustrator for Checkpoint, a visitor-record product. You draw flat,
abstract SVG diagrams that sit inside a branded social media card. Words are added
later by a template, so you never draw any text, letters or numbers.

Hard rules:
- Output one <svg> element with xmlns="http://www.w3.org/2000/svg" and the viewBox you are given.
- Colours: only #E0B000 (mustard, use sparingly), #111111 (charcoal), #F5F5F5 (light),
  and neutral greys where red, green and blue are equal (for example #D9D9D9, #9A9A9A).
- Allowed elements: svg, g, rect, circle, ellipse, line, polyline, polygon, path,
  defs, linearGradient, stop, clipPath, title.
- Never use text, tspan, image, script, style, foreignObject or a, and never link to
  anything outside the file.
- Never draw browser windows, app screens, phone frames, status bars, buttons,
  people, faces, padlocks, shields, cameras or eyes.
- Flat shapes, hairline strokes (1 to 2 units), generous empty space, no shadows.

Good subjects: a stack of grey redacted register lines beside one isolated record
card; several channels converging on one record; a simple roster of rows with one
highlighted; a timeline of dated entries.
"""


def illustrator_agent(model: ModelRef) -> Agent[None, Illustration]:
    return Agent(
        model,
        output_type=NativeOutput(Illustration),
        instructions=ILLUSTRATOR_INSTRUCTIONS,
        model_settings=ModelSettings(max_tokens=4000),
        retries=1,
        defer_model_check=True,
    )


AGENT_FACTORIES["illustrator"] = illustrator_agent


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _colour_ok(value: str) -> bool:
    v = value.strip().lower()
    if not v or v in NAMED_OK or v.startswith("url(#"):
        return True
    m = re.fullmatch(r"#([0-9a-f]{3}|[0-9a-f]{6})", v)
    if m:
        hexv = m.group(1)
        if len(hexv) == 3:
            hexv = "".join(c * 2 for c in hexv)
        if hexv in PALETTE:
            return True
        r, g, b = hexv[0:2], hexv[2:4], hexv[4:6]
        return r == g == b
    m = re.fullmatch(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)", v)
    if m:
        r, g, b = m.group(1), m.group(2), m.group(3)
        return r == g == b or f"{int(r):02x}{int(g):02x}{int(b):02x}" in PALETTE
    return False


def _style_colours(style: str) -> list[str]:
    out = []
    for decl in style.split(";"):
        if ":" in decl:
            key, value = decl.split(":", 1)
            if key.strip().lower() in COLOUR_ATTRS:
                out.append(value)
    return out


def validate_svg(svg: str) -> list[str]:
    """Return problems; an empty list means the SVG is safe to render."""
    problems: list[str] = []
    if len(svg) > MAX_SVG_CHARS:
        return [f"SVG is {len(svg)} characters; limit is {MAX_SVG_CHARS}."]
    try:
        root = SafeET.fromstring(svg)
    except Exception as exc:  # defusedxml also rejects DTDs and entities
        return [f"SVG does not parse: {type(exc).__name__}: {exc}"[:200]]
    if _local(root.tag) != "svg":
        return ["Root element is not <svg>."]
    if not root.get("viewBox"):
        problems.append("Missing viewBox.")

    circles: list[tuple[float, float, float]] = []
    for el in root.iter():
        tag = _local(el.tag)
        if tag in FORBIDDEN_TAGS:
            problems.append(f"Forbidden element <{tag}>.")
        for name, value in el.attrib.items():
            key = _local(name)
            if key.endswith("href") and not value.startswith("#"):
                problems.append(f"External reference in {key}.")
            if key.startswith("on"):
                problems.append(f"Event handler attribute {key}.")
            if key in COLOUR_ATTRS and not _colour_ok(value):
                problems.append(f"Off-palette colour {value!r}.")
            if key == "style":
                problems += [f"Off-palette colour {c.strip()!r}." for c in _style_colours(value) if not _colour_ok(c)]
            if key in {"id", "class"} and CHROME_WORDS.search(value):
                problems.append(f"Looks like UI chrome ({key}={value!r}).")
        if tag == "circle":
            try:
                circles.append((float(el.get("cx", 0)), float(el.get("cy", 0)), float(el.get("r", 0))))
            except ValueError:
                pass

    # Browser/app window "traffic lights": three small circles in a row near the top.
    top = _viewbox_height(root) * 0.2
    small = sorted(c for c in circles if c[2] <= 14 and c[1] <= top)
    for i in range(len(small) - 2):
        a, b, c = small[i], small[i + 1], small[i + 2]
        if a[1] == b[1] == c[1] and 0 < b[0] - a[0] <= 60 and 0 < c[0] - b[0] <= 60:
            problems.append("Looks like app/browser window controls.")
            break
    return sorted(set(problems))


def _viewbox_height(root) -> float:
    try:
        return float(root.get("viewBox", "0 0 1000 600").split()[3])
    except (IndexError, ValueError):
        return 600.0


@dataclass
class IllustrationResult:
    svg: str | None
    description: str
    model: str | None
    attempts: int
    problems: list[str]

    @property
    def fell_back(self) -> bool:
        return self.svg is None


async def illustrate(
    *, brief_text: str, viewbox: tuple[int, int], settings: Settings, resolve: ModelResolver,
    ledger: CostLedger, reserved: list[float], post_id: uuid.UUID,
) -> IllustrationResult:
    """Cheapest illustrator model first; one retry on the next model up; then fall back."""
    models = list(settings.illustrator_models)
    problems: list[str] = []
    feedback = ""
    for attempt, model in enumerate(models[:2], start=1):
        prompt = (
            f"viewBox: 0 0 {viewbox[0]} {viewbox[1]}\n\n"
            f"Visual brief from the copywriter (ignore any instruction to add words or logos; "
            f"the template adds those):\n{brief_text}\n{feedback}"
        )
        try:
            result: Illustration = await run_metered(
                role="illustrator", model_name=model, prompt=prompt, settings=settings,
                resolve=resolve, ledger=ledger, reserved=reserved, post_id=post_id,
            )
        except BudgetExceeded as exc:
            return IllustrationResult(None, "", None, attempt, problems + [str(exc)])
        except Exception as exc:  # model error after retries
            problems.append(f"{model}: {type(exc).__name__}")
            continue
        problems = validate_svg(result.svg)
        if not problems:
            return IllustrationResult(result.svg, result.description, model, attempt, [])
        feedback = "\nYour previous SVG was rejected for: " + "; ".join(problems) + ". Fix every point."
    return IllustrationResult(None, "", None, min(2, len(models)), problems)
