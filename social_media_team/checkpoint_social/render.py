"""Render approved posts to image files with Pillow brand templates.

All words come from the approved copy and are set by these templates in Archivo.
Illustrations (optional, one per post, on the cover) come from the illustrator
role as validated SVG and are composited in. Product screens come only from the
synthetic demo-tenant screenshots in website/public/screenshots; when a slide
asks for a screen we do not have, it gets a clearly labelled placeholder file.

Output: out/<week>/<platform>/<post-id>/ with slide PNGs (or image.png), a PDF
for LinkedIn carousels, caption.md and alt.txt, plus out/<week>/manifest.json.
"""

from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import resvg_py
from PIL import Image, ImageDraw, ImageFont

from .models import PostBrief, PostDraft
from .strategy import APPROVED_AMOUNTS, PRICE_CARD

PACKAGE_ROOT = Path(__file__).resolve().parent.parent          # social_media_team/
REPO_ROOT = PACKAGE_ROOT.parent                                  # buffrcheckpoint/
FONT_PATH = PACKAGE_ROOT / "assets" / "fonts" / "Archivo[wdth,wght].ttf"
ICON_PATH = REPO_ROOT / "branding" / "exports" / "icon-512.png"
SCREENSHOT_DIR = REPO_ROOT / "website" / "public" / "screenshots"

MUSTARD = (224, 176, 0)
CHARCOAL = (17, 17, 17)
LIGHT = (245, 245, 245)
HAIRLINE = (217, 217, 217)
MUTED = (95, 95, 95)

PORTRAIT = (1080, 1350)
SIZES = {"linkedin": PORTRAIT, "instagram": PORTRAIT, "facebook": PORTRAIT, "x": (1600, 900)}
FACEBOOK_LINK = (1200, 630)
SITE_LABEL = "buffrcheckpoint.com"

# Screenshot requests in a visual brief, matched to the synthetic demo-tenant files we have.
SCREENSHOT_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"front desk|roster|pending approval|on[- ]site list|who is on site", re.I), "front-desk.png"),
    (re.compile(r"device|kiosk|cran|mdm", re.I), "device-compliance.png"),
    (re.compile(r"compliance dashboard|audit|evidence|retention|exception", re.I), "compliance-dashboard.png"),
]
NO_ILLUSTRATION = re.compile(r"type only|text only|no imagery|no image|no illustration|text-only|type-only", re.I)


# ------------------------------------------------------------------ fonts ---


@lru_cache(maxsize=64)
def font(size: int, weight: str = "Regular") -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT_PATH), size)
    f.set_variation_by_name(weight)
    return f


def wrap(text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        words, line = para.split(), ""
        for word in words:
            trial = f"{line} {word}".strip()
            if fnt.getlength(trial) <= width or not line:
                line = trial
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def fit(text: str, width: int, height: int, weight: str, max_size: int, min_size: int,
        spacing: float = 1.22) -> tuple[ImageFont.FreeTypeFont, list[str], int]:
    """Largest size whose wrapped lines fit the box."""
    size = max_size
    while True:
        fnt = font(size, weight)
        lines = wrap(text, fnt, width)
        line_h = int(size * spacing)
        if line_h * len(lines) <= height or size <= min_size:
            return fnt, lines, line_h
        size -= 2


def draw_lines(draw: ImageDraw.ImageDraw, xy: tuple[int, int], lines: list[str], fnt, line_h: int,
               fill=CHARCOAL) -> int:
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


# ---------------------------------------------------------------- pieces ----


@lru_cache(maxsize=8)
def _icon(px: int) -> Image.Image:
    return Image.open(ICON_PATH).convert("RGBA").resize((px, px), Image.Resampling.LANCZOS)


def lockup(img: Image.Image, x: int, y: int, icon_px: int) -> int:
    """Icon plus the word Checkpoint, as in the website header. Returns the bottom y."""
    img.alpha_composite(_icon(icon_px), (x, y))
    draw = ImageDraw.Draw(img)
    fnt = font(int(icon_px * 0.56), "SemiBold")
    top = y + (icon_px - fnt.size) // 2 - int(fnt.size * 0.12)
    draw.text((x + icon_px + int(icon_px * 0.3), top), "Checkpoint", font=fnt, fill=CHARCOAL)
    return y + icon_px


def canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw, int]:
    w, h = size
    img = Image.new("RGBA", size, LIGHT + (255,))
    draw = ImageDraw.Draw(img)
    margin = int(min(w, h) * 0.075)
    inset = margin // 2
    draw.rectangle([inset, inset, w - inset - 1, h - inset - 1], outline=HAIRLINE, width=2)
    return img, draw, margin


def footer(draw: ImageDraw.ImageDraw, size: tuple[int, int], margin: int, counter: str | None) -> int:
    w, h = size
    fnt = font(int(min(w, h) * 0.024), "Medium")
    y = h - margin - fnt.size
    draw.text((margin, y), SITE_LABEL, font=fnt, fill=MUTED)
    if counter:
        draw.text((w - margin - fnt.getlength(counter), y), counter, font=fnt, fill=MUTED)
    return y


def accent(draw: ImageDraw.ImageDraw, x: int, y: int, scale: int) -> int:
    height = max(4, scale // 2)
    draw.rectangle([x, y, x + scale * 6, y + height], fill=MUSTARD)
    return int(y + height)


def svg_to_image(svg: str, width: int, height: int) -> Image.Image:
    data = resvg_py.svg_to_bytes(svg_string=svg, width=width, height=height)
    return Image.open(io.BytesIO(bytes(data))).convert("RGBA")


def paste_fitted(img: Image.Image, src: Image.Image, box: tuple[int, int, int, int], top_align: bool = False) -> None:
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    scale = min(bw / src.width, bh / src.height)
    if top_align:  # screenshots: fill the width, keep the top of the screen
        scale = bw / src.width
    resized = src.resize((max(1, int(src.width * scale)), max(1, int(src.height * scale))), Image.Resampling.LANCZOS)
    if resized.height > bh:
        resized = resized.crop((0, 0, resized.width, bh))
    px = x0 + (bw - resized.width) // 2
    py = y0 if top_align else y0 + (bh - resized.height) // 2
    img.alpha_composite(resized.convert("RGBA"), (px, py))


# ---------------------------------------------------------------- cards -----


def cover_card(size, text: str, illustration: Image.Image | None, counter: str | None) -> Image.Image:
    img, draw, m = canvas(size)
    w, h = size
    landscape = w > h
    icon_px = int(min(w, h) * 0.075)
    y = lockup(img, m, m, icon_px) + int(m * 0.8)
    y = accent(draw, m, y, icon_px // 6) + int(m * 0.5)
    bottom = footer(draw, size, m, counter) - int(m * 0.5)
    if illustration is not None and landscape:
        text_w = int((w - 3 * m) * 0.55)
        fnt, lines, lh = fit(text, text_w, bottom - y, "SemiBold", int(h * 0.075), int(h * 0.035))
        draw_lines(draw, (m, y), lines, fnt, lh)
        paste_fitted(img, illustration, (m * 2 + text_w, y, w - m, bottom))
    elif illustration is not None:
        text_h = int((bottom - y) * 0.45)
        fnt, lines, lh = fit(text, w - 2 * m, text_h, "SemiBold", int(w * 0.075), int(w * 0.04))
        end = draw_lines(draw, (m, y), lines, fnt, lh)
        paste_fitted(img, illustration, (m, end + int(m * 0.5), w - m, bottom))
    else:
        fnt, lines, lh = fit(text, w - 2 * m, bottom - y, "SemiBold", int(min(w, h) * 0.085), int(min(w, h) * 0.04))
        draw_lines(draw, (m, y), lines, fnt, lh)
    return img.convert("RGB")


def text_card(size, text: str, counter: str | None) -> Image.Image:
    img, draw, m = canvas(size)
    w, h = size
    icon_px = int(min(w, h) * 0.05)
    y = lockup(img, m, m, icon_px) + m
    bottom = footer(draw, size, m, counter) - m
    fnt, lines, lh = fit(text, w - 2 * m, bottom - y, "Medium", int(min(w, h) * 0.07), int(min(w, h) * 0.035))
    block = lh * len(lines)
    draw_lines(draw, (m, y + max(0, (bottom - y - block) // 2)), lines, fnt, lh)
    return img.convert("RGB")


def screenshot_card(size, text: str, shot: Path | None, need: str, counter: str | None) -> Image.Image:
    img, draw, m = canvas(size)
    w, h = size
    icon_px = int(min(w, h) * 0.05)
    y = lockup(img, m, m, icon_px) + int(m * 0.7)
    fnt, lines, lh = fit(text, w - 2 * m, int(h * 0.16), "Medium", int(min(w, h) * 0.05), int(min(w, h) * 0.03))
    y = draw_lines(draw, (m, y), lines, fnt, lh) + int(m * 0.4)
    bottom = footer(draw, size, m, counter) - int(m * 0.5)
    frame = (m, y, w - m, bottom)
    if shot is not None:
        paste_fitted(img, Image.open(shot), frame, top_align=True)
        draw.rectangle(frame, outline=HAIRLINE, width=2)
    else:
        for i in range(frame[0], frame[2], 24):  # dashed frame marks it as unfinished
            draw.line([(i, frame[1]), (min(i + 12, frame[2]), frame[1])], fill=MUTED, width=2)
            draw.line([(i, frame[3]), (min(i + 12, frame[2]), frame[3])], fill=MUTED, width=2)
        for j in range(frame[1], frame[3], 24):
            draw.line([(frame[0], j), (frame[0], min(j + 12, frame[3]))], fill=MUTED, width=2)
            draw.line([(frame[2], j), (frame[2], min(j + 12, frame[3]))], fill=MUTED, width=2)
        label = f"PLACEHOLDER. Screenshot needed: {need}"
        lf, ll, llh = fit(label, frame[2] - frame[0] - m, frame[3] - frame[1] - m, "SemiBold",
                          int(min(w, h) * 0.035), int(min(w, h) * 0.022))
        draw_lines(draw, (frame[0] + m // 2, frame[1] + m // 2), ll, lf, llh, fill=MUTED)
    return img.convert("RGB")


def price_card(size, text: str, counter: str | None) -> Image.Image:
    img, draw, m = canvas(size)
    w, h = size
    icon_px = int(min(w, h) * 0.06)
    y = lockup(img, m, m, icon_px) + int(m * 0.7)
    fnt, lines, lh = fit(text, w - 2 * m, int(h * 0.2), "SemiBold", int(min(w, h) * 0.06), int(min(w, h) * 0.035))
    y = draw_lines(draw, (m, y), lines, fnt, lh) + int(m * 0.6)
    bottom = footer(draw, size, m, counter) - int(m * 0.4)
    row_h = (bottom - y) // len(PRICE_CARD)
    name_f = font(int(min(w, h) * 0.045), "SemiBold")
    price_f = font(int(min(w, h) * 0.045), "Medium")
    note_f = font(int(min(w, h) * 0.027), "Regular")
    for i, (name, price, note) in enumerate(PRICE_CARD):
        top = y + i * row_h
        if i:
            draw.line([(m, top), (w - m, top)], fill=HAIRLINE, width=2)
        ty = top + int(row_h * 0.2)
        draw.rectangle([m, ty + 6, m + 8, ty + name_f.size], fill=MUSTARD)
        draw.text((m + 28, ty), name, font=name_f, fill=CHARCOAL)
        draw.text((w - m - price_f.getlength(price), ty), price, font=price_f, fill=CHARCOAL)
        draw.text((m + 28, ty + int(name_f.size * 1.35)), note, font=note_f, fill=MUTED)
    return img.convert("RGB")


# ------------------------------------------------------------- planning -----


def slide_segments(visual_brief: str) -> dict[int, str]:
    """Split a brief into "Slide N: ..." segments (also "Shot N")."""
    parts = re.split(r"(?i)\b(?:slide|shot)\s+(\d+)\s*[:.]", visual_brief)
    return {int(parts[i]): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def screenshot_for(segment: str) -> tuple[bool, Path | None]:
    """(asks_for_screenshot, matching file or None)."""
    if "screenshot" not in segment.lower():
        return False, None
    for pattern, name in SCREENSHOT_RULES:
        if pattern.search(segment) and (SCREENSHOT_DIR / name).exists():
            return True, SCREENSHOT_DIR / name
    return True, None


def _short(text: str, limit: int = 200) -> str:
    """First sentences up to the limit, never cut mid-word."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind(".\n"))
    return cut[: end + 1] if end > limit // 3 else cut.rsplit(" ", 1)[0] + "..."


def mentions_price(text: str) -> bool:
    return any(amount in text.replace(" ", "") for amount in APPROVED_AMOUNTS)


def wants_illustration(draft: PostDraft) -> bool:
    return not NO_ILLUSTRATION.search(draft.visual_brief) and not mentions_price(
        f"{draft.hook} {draft.body}"
    )


def image_size(brief: PostBrief, draft: PostDraft) -> tuple[int, int]:
    if brief.platform == "facebook" and brief.format == "text" and "buffrcheckpoint.com" in draft.cta_text:
        return FACEBOOK_LINK
    return SIZES[brief.platform]


@dataclass
class RenderedPost:
    post_id: str
    folder: Path
    files: list[str] = field(default_factory=list)
    placeholders: list[str] = field(default_factory=list)
    illustration: dict[str, Any] | None = None


def caption_markdown(row: Any, brief: PostBrief, draft: PostDraft) -> str:
    lines = [
        f"# {brief.platform.upper()} | {brief.pillar} | {brief.format}",
        "",
        f"Post id: `{row['id']}`  ",
        f"Writer: {row['writer_model']}  ",
        f"Discovery question for replies: {brief.discovery_question}",
        "",
        "## Copy",
        "",
        draft.hook,
        "",
    ]
    if draft.body:
        lines += [draft.body, ""]
    if draft.slides and brief.format in {"thread", "poll", "reel_script"}:
        title = {"thread": "Tweets", "poll": "Poll options", "reel_script": "Shot list"}[brief.format]
        lines += [f"## {title}", "", *[f"{i}. {s}" for i, s in enumerate(draft.slides, 1)], ""]
    lines += ["## Call to action", "", draft.cta_text, ""]
    if draft.hashtags:
        lines += ["## Hashtags", "", " ".join(draft.hashtags), ""]
    lines += ["## Visual brief", "", draft.visual_brief, ""]
    return "\n".join(lines)


async def render_post(row: Any, brief: PostBrief, draft: PostDraft, week_dir: Path,
                      illustrate_cover) -> RenderedPost:
    """illustrate_cover(brief_text, (w, h)) -> (Image | None, info dict | None)."""
    post_id = str(row["id"])
    folder = week_dir / brief.platform / post_id
    folder.mkdir(parents=True, exist_ok=True)
    out = RenderedPost(post_id=post_id, folder=folder)

    (folder / "caption.md").write_text(caption_markdown(row, brief, draft))
    (folder / "alt.txt").write_text(draft.alt_text.strip() + "\n")
    out.files += ["caption.md", "alt.txt"]

    if brief.format == "reel_script" or (brief.platform == "x" and brief.format == "poll"):
        return out  # reels are scripts; X polls cannot carry an image

    size = image_size(brief, draft)
    segments = slide_segments(draft.visual_brief)

    async def cover(text: str, counter: str | None) -> Image.Image:
        if mentions_price(f"{draft.hook} {draft.body} {text}"):
            return price_card(size, text, counter)
        illo = None
        if wants_illustration(draft):
            vb = (1000, 1000) if size[0] <= size[1] else (1000, 800)
            illo, info = await illustrate_cover(draft.visual_brief, vb)
            out.illustration = info
        return cover_card(size, text, illo, counter)

    if brief.format == "carousel" and draft.slides:
        pages: list[Image.Image] = []
        total = len(draft.slides)
        for n, text in enumerate(draft.slides, start=1):
            counter = f"{n}/{total}"
            asks, shot = screenshot_for(segments.get(n, ""))
            if asks:
                need = _short(segments.get(n, ""))
                page = screenshot_card(size, text, shot, need, counter)
                name = f"slide-{n:02d}.png" if shot else f"slide-{n:02d}-PLACEHOLDER.png"
                if not shot:
                    out.placeholders.append(name)
            elif n == 1:
                page, name = await cover(text, counter), f"slide-{n:02d}.png"
            else:
                page, name = text_card(size, text, counter), f"slide-{n:02d}.png"
            page.save(folder / name, "PNG", optimize=True)
            out.files.append(name)
            pages.append(page)
        if brief.platform == "linkedin":
            pages[0].save(folder / "carousel.pdf", "PDF", save_all=True, append_images=pages[1:], resolution=150)
            out.files.append("carousel.pdf")
        return out

    image = await cover(draft.hook, None)
    image.save(folder / "image.png", "PNG", optimize=True)
    out.files.append("image.png")
    return out


def write_manifest(week_dir: Path, week: str, run_id: str, spent: float, entries: list[dict[str, Any]]) -> Path:
    path = week_dir / "manifest.json"
    path.write_text(json.dumps(
        {"week": week, "render_run_id": run_id, "illustration_spend_usd": round(spent, 6), "posts": entries},
        indent=2, default=str,
    ) + "\n")
    return path


def write_index(week_dir: Path, week: str, entries: list[dict[str, Any]]) -> Path:
    """A single page to look at the whole week in a browser: images, status and copy."""
    import html

    cards = []
    for e in entries:
        folder = week_dir / e["folder"]
        images = [f for f in e["files"] if f.endswith(".png")]
        caption = (folder / "caption.md").read_text() if (folder / "caption.md").exists() else ""
        imgs = "".join(
            f'<a href="{html.escape(e["folder"])}/{html.escape(f)}"><img src="{html.escape(e["folder"])}/{html.escape(f)}" '
            f'alt="{html.escape(f)}" loading="lazy"></a>' for f in images
        ) or '<p class="none">No image for this format (caption and shot list only).</p>'
        pdf = (f' | <a href="{html.escape(e["folder"])}/carousel.pdf">carousel.pdf</a>' if "carousel.pdf" in e["files"] else "")
        warn = (f'<p class="warn">{len(e["placeholders"])} placeholder slide(s): a real screenshot is needed.</p>'
                if e["placeholders"] else "")
        cards.append(
            f'<section><h2>{html.escape(e["platform"])} / {html.escape(e["pillar"])} / {html.escape(e["format"])}'
            f' <span class="status s-{html.escape(e["status"])}">{html.escape(e["status"])}</span></h2>'
            f'<p class="meta">{html.escape(e["id"])} | <a href="{html.escape(e["folder"])}/caption.md">caption.md</a>{pdf}</p>'
            f'{warn}<div class="imgs">{imgs}</div><pre>{html.escape(caption)}</pre></section>'
        )
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Checkpoint posts {html.escape(week)}</title>
<style>
body{{margin:0;padding:24px;background:#F5F5F5;color:#111;font:15px/1.5 system-ui,sans-serif}}
h1{{font-size:24px;margin:0 0 20px}} section{{background:#fff;border:1px solid #d9d9d9;border-radius:10px;padding:18px;margin:0 0 20px}}
h2{{font-size:17px;margin:0 0 4px}} .meta{{color:#5f5f5f;font-size:13px;margin:0 0 10px}}
.imgs{{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}} .imgs img{{height:320px;border:1px solid #d9d9d9;border-radius:6px}}
pre{{white-space:pre-wrap;background:#F5F5F5;border-radius:6px;padding:12px;font-size:13px;max-height:340px;overflow:auto}}
.status{{font-size:12px;padding:2px 8px;border-radius:999px;background:#eee;margin-left:6px}}
.s-approved{{background:#e4f2e6}} .s-needs_human{{background:#fbe9c4}} .warn{{color:#8a5a00;font-size:13px}} .none{{color:#5f5f5f}}
</style></head><body><h1>Checkpoint posts, week of {html.escape(week)} ({len(entries)} posts)</h1>
{"".join(cards)}</body></html>
"""
    path = week_dir / "index.html"
    path.write_text(page)
    return path
