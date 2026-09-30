"""SVG validation and template rendering, without model calls or a database."""

import asyncio

from PIL import Image

from checkpoint_social.illustrator import validate_svg
from checkpoint_social.models import PostBrief, PostDraft
from checkpoint_social.render import render_post, screenshot_for, slide_segments

GOOD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
        '<rect x="100" y="100" width="300" height="40" fill="#D9D9D9"/>'
        '<rect x="500" y="300" width="300" height="200" fill="#F5F5F5" stroke="#111111" stroke-width="2"/>'
        '<circle cx="650" cy="400" r="20" fill="#E0B000"/></svg>')


def test_good_svg_passes():
    assert validate_svg(GOOD) == []


def test_svg_rejections():
    bad_colour = GOOD.replace("#D9D9D9", "#FF0000")
    with_text = GOOD.replace("</svg>", "<text x='1' y='1'>Hi</text></svg>")
    external = GOOD.replace("</svg>", '<use href="https://evil.example/x.svg#a"/></svg>')
    script = GOOD.replace("</svg>", "<script>alert(1)</script></svg>")
    chrome = GOOD.replace("</svg>", "".join(
        f'<circle cx="{x}" cy="30" r="8" fill="#9A9A9A"/>' for x in (40, 70, 100)) + "</svg>")
    assert any("Off-palette" in p for p in validate_svg(bad_colour))
    assert any("<text>" in p for p in validate_svg(with_text))
    assert any("External" in p for p in validate_svg(external))
    assert any("<script>" in p for p in validate_svg(script))
    assert any("window controls" in p for p in validate_svg(chrome))
    assert validate_svg("<svg") and validate_svg('<!DOCTYPE x [<!ENTITY a "b">]><svg/>')


def test_screenshot_matching():
    segs = slide_segments("Slide 1: cover. Slide 2: REQUIRED screenshot of the Front Desk roster. "
                          "Slide 3: screenshot of the visitor check-in screen on a phone.")
    assert screenshot_for(segs[2])[1].name == "front-desk.png"
    asks, shot = screenshot_for(segs[3])
    assert asks and shot is None  # no matching demo screen -> placeholder


def _row(platform, fmt):
    return {"id": f"00000000-0000-0000-0000-00000000000{len(platform)}", "writer_model": "test"}


def test_linkedin_carousel_renders_pngs_and_pdf(tmp_path):
    brief = PostBrief(platform="linkedin", pillar="proof_not_promises", format="carousel", audience="a",
                      angle="b", discovery_question="When did c?", cta="see_pricing", explore=False)
    draft = PostDraft(hook="When did an auditor last ask who was on site?", body="Body.",
                      slides=["Cover line", "Second line", "Third line"],
                      visual_brief="Slide 2: screenshot of the Front Desk roster. Type only otherwise.",
                      alt_text="Alt.", cta_text="See pricing.")

    async def no_illustration(_text, _vb):
        return None, None

    out = asyncio.run(render_post(_row("linkedin", "carousel"), brief, draft, tmp_path, no_illustration))
    assert {"slide-01.png", "slide-02.png", "slide-03.png", "carousel.pdf", "caption.md", "alt.txt"} <= set(out.files)
    assert Image.open(out.folder / "slide-01.png").size == (1080, 1350)
    assert out.placeholders == []


def test_x_price_post_is_landscape(tmp_path):
    brief = PostBrief(platform="x", pillar="proof_not_promises", format="text", audience="a", angle="b",
                      discovery_question="When did c?", cta="see_pricing", explore=False)
    draft = PostDraft(hook="Checkpoint Site is N$1,500 per month.", body="", visual_brief="Price card.",
                      alt_text="Alt.", cta_text="See pricing")

    async def fail_if_called(_text, _vb):
        raise AssertionError("price posts use the template, not an illustration")

    out = asyncio.run(render_post(_row("x", "text"), brief, draft, tmp_path, fail_if_called))
    assert Image.open(out.folder / "image.png").size == (1600, 900)
