#!/usr/bin/env python3
"""Build Buffr Checkpoint branding exports from canon sources."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
MUSTARD = (224, 176, 0, 255)  # #E0B000
CHARCOAL = (17, 17, 17, 255)  # #111111
LIGHT = (245, 245, 245, 255)  # #F5F5F5
WHITE = (255, 255, 255, 255)


def write_svgs() -> None:
    # Icon mark: mustard C-frame open on RIGHT, charcoal inner square
    icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Outer C-frame: rounded square with gap on the right -->
  <path fill="#E0B000" fill-rule="evenodd" d="
    M 96 64
    H 352
    A 64 64 0 0 1 416 128
    V 192
    H 352
    V 144
    A 16 16 0 0 0 336 128
    H 176
    A 48 48 0 0 0 128 176
    V 336
    A 48 48 0 0 0 176 384
    H 336
    A 16 16 0 0 0 352 368
    V 320
    H 416
    V 384
    A 64 64 0 0 1 352 448
    H 96
    A 64 64 0 0 1 32 384
    V 128
    A 64 64 0 0 1 96 64
    Z
    M 176 176
    H 336
    V 336
    H 176
    Z
  "/>
  <!-- Inner charcoal square (drawn as cutout fill via second rect on top of hole) -->
  <rect x="188" y="188" width="136" height="136" rx="8" fill="#111111"/>
</svg>
"""
    # Simpler, cleaner geometry matching sheet better
    icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <path fill="#E0B000" d="
    M128 64h224c35.3 0 64 28.7 64 64v64h-72V144c0-8.8-7.2-16-16-16H160c-17.7 0-32 14.3-32 32v192c0 17.7 14.3 32 32 32h168c8.8 0 16-7.2 16-16v-48h72v64c0 35.3-28.7 64-64 64H128c-35.3 0-64-28.7-64-64V128c0-35.3 28.7-64 64-64z
  "/>
  <rect x="176" y="176" width="160" height="160" rx="12" fill="#111111"/>
</svg>
"""
    (ROOT / "icon.svg").write_text(icon_svg)

    def app_icon(bg: str, frame: str, core: str, name: str) -> None:
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="{bg}"/>
  <path fill="{frame}" d="
    M128 96h224c26.5 0 48 21.5 48 48v56h-64v-40c0-8.8-7.2-16-16-16H160c-17.7 0-32 14.3-32 32v192c0 17.7 14.3 32 32 32h160c8.8 0 16-7.2 16-16v-40h64v56c0 26.5-21.5 48-48 48H128c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48z
  "/>
  <rect x="176" y="176" width="160" height="160" rx="12" fill="{core}"/>
</svg>
"""
        (ROOT / name).write_text(svg)

    app_icon("#E0B000", "#FFFFFF", "#111111", "app-icon-mustard.svg")
    app_icon("#111111", "#E0B000", "#9A9A9A", "app-icon-charcoal.svg")
    app_icon("#F5F5F5", "#E0B000", "#111111", "app-icon-light.svg")


def rasterize_svg_via_pillow(svg_path: Path, out: Path, size: int) -> None:
    """Fallback raster without rsvg: paint known SVG variants with Pillow."""
    name = svg_path.name
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size / 512

    def R(x, y, w, h, **kw):
        d.rounded_rectangle([x * s, y * s, (x + w) * s, (y + h) * s], **kw)

    def poly_c_frame(color):
        # Approximate C-frame with thick rounded rectangle left/top/bottom + open right
        # Outer plate then cut inner with destination-out isn't available easily;
        # draw as thick strokes via polygons.
        # Use path approximation: left column, top bar, bottom bar, right stubs.
        thick = 64 * s
        # left
        d.rounded_rectangle([64 * s, 64 * s, (64 + 64) * s, (512 - 64) * s], radius=32 * s, fill=color)
        # top
        d.rounded_rectangle([64 * s, 64 * s, (512 - 96) * s, (64 + 64) * s], radius=32 * s, fill=color)
        # bottom
        d.rounded_rectangle([64 * s, (512 - 64 - 64) * s, (512 - 96) * s, (512 - 64) * s], radius=32 * s, fill=color)
        # right top stub
        d.rounded_rectangle([(512 - 96 - 40) * s, 64 * s, (512 - 64) * s, (64 + 100) * s], radius=20 * s, fill=color)
        # right bottom stub
        d.rounded_rectangle([(512 - 96 - 40) * s, (512 - 64 - 100) * s, (512 - 64) * s, (512 - 64) * s], radius=20 * s, fill=color)

    if name.startswith("app-icon"):
        if "mustard" in name:
            bg, frame, core = MUSTARD, WHITE, CHARCOAL
        elif "charcoal" in name:
            bg, frame, core = CHARCOAL, MUSTARD, (154, 154, 154, 255)
        else:
            bg, frame, core = LIGHT, MUSTARD, CHARCOAL
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(96 * s), fill=bg)
        # frame
        margin = 96 * s
        gap = 56 * s
        # Draw C as thick rounded rect with right gap via four parts
        t = 48 * s
        # left
        d.rounded_rectangle([margin, margin, margin + t, size - margin], radius=t / 2, fill=frame)
        # top
        d.rounded_rectangle([margin, margin, size - margin - gap, margin + t], radius=t / 2, fill=frame)
        # bottom
        d.rounded_rectangle([margin, size - margin - t, size - margin - gap, size - margin], radius=t / 2, fill=frame)
        # top-right stub
        d.rounded_rectangle([size - margin - gap - t * 0.3, margin, size - margin, margin + t * 1.4], radius=t / 3, fill=frame)
        # bottom-right stub
        d.rounded_rectangle([size - margin - gap - t * 0.3, size - margin - t * 1.4, size - margin, size - margin], radius=t / 3, fill=frame)
        # core
        cs = 160 * s
        cx = (size - cs) / 2
        d.rounded_rectangle([cx, cx, cx + cs, cx + cs], radius=12 * s, fill=core)
    else:
        # transparent icon mark
        poly_c_frame(MUSTARD)
        cs = 160 * s
        cx = (size - cs) / 2
        d.rounded_rectangle([cx, cx, cx + cs, cx + cs], radius=12 * s, fill=CHARCOAL)

    im.save(out)


def process_wordmark() -> Image.Image:
    src = Image.open(ROOT / "wordmark-source.png").convert("RGBA")
    # Make near-white background transparent
    pixels = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r > 245 and g > 245 and b > 245:
                pixels[x, y] = (255, 255, 255, 0)
    # Trim
    bbox = src.getbbox()
    if bbox:
        src = src.crop(bbox)
    src.save(ROOT / "wordmark.png")
    return src


def compose_logos(wordmark: Image.Image, icon_512: Image.Image) -> None:
    # Horizontal: icon left + wordmark right
    icon = icon_512.resize((280, 280), Image.Resampling.LANCZOS)
    wm = wordmark.copy()
    # scale wordmark height to ~220
    target_h = 220
    scale = target_h / wm.height
    wm = wm.resize((max(1, int(wm.width * scale)), target_h), Image.Resampling.LANCZOS)
    pad = 40
    gap = 48
    W = pad * 2 + icon.width + gap + wm.width
    H = pad * 2 + max(icon.height, wm.height)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    iy = (H - icon.height) // 2
    wy = (H - wm.height) // 2
    canvas.paste(icon, (pad, iy), icon)
    canvas.paste(wm, (pad + icon.width + gap, wy), wm)
    canvas.save(ROOT / "logo-horizontal.png")
    canvas.save(EXPORTS / "logo-horizontal.png")

    # Stacked: icon above wordmark
    icon2 = icon_512.resize((240, 240), Image.Resampling.LANCZOS)
    wm2 = wordmark.copy()
    target_w = 360
    scale = target_w / wm2.width
    wm2 = wm2.resize((target_w, max(1, int(wm2.height * scale))), Image.Resampling.LANCZOS)
    pad = 40
    gap = 36
    W = pad * 2 + max(icon2.width, wm2.width)
    H = pad * 2 + icon2.height + gap + wm2.height
    stacked = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    stacked.paste(icon2, ((W - icon2.width) // 2, pad), icon2)
    stacked.paste(wm2, ((W - wm2.width) // 2, pad + icon2.height + gap), wm2)
    stacked.save(ROOT / "logo-stacked.png")
    stacked.save(EXPORTS / "logo-stacked.png")

    # OG 1200x630
    og = Image.new("RGBA", (1200, 630), LIGHT)
    # place horizontal logo centered
    logo = canvas.copy()
    max_w = 900
    if logo.width > max_w:
        s = max_w / logo.width
        logo = logo.resize((max_w, max(1, int(logo.height * s))), Image.Resampling.LANCZOS)
    og.paste(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2), logo)
    og.convert("RGB").save(EXPORTS / "og-1200x630.png")


def main() -> None:
    EXPORTS.mkdir(parents=True, exist_ok=True)
    write_svgs()

    # Raster icons
    for name in ("icon.svg", "app-icon-mustard.svg", "app-icon-charcoal.svg", "app-icon-light.svg"):
        for size in (512, 256, 180):
            out = EXPORTS / f"{Path(name).stem}-{size}.png"
            rasterize_svg_via_pillow(ROOT / name, out, size)

    icon_512 = Image.open(EXPORTS / "app-icon-mustard-512.png").convert("RGBA")
    # Transparent mark for chrome that shouldn't have plate — use icon.svg raster
    mark_512 = Image.open(EXPORTS / "icon-512.png").convert("RGBA")
    mark_512.save(EXPORTS / "icon-mark-512.png")

    # Prefer mustard app icon as product icon.png (512)
    icon_512.save(EXPORTS / "icon-512.png")
    Image.open(EXPORTS / "app-icon-mustard-256.png").save(EXPORTS / "icon-256.png")
    Image.open(EXPORTS / "app-icon-mustard-180.png").save(EXPORTS / "apple-touch-180.png")

    wordmark = process_wordmark()
    compose_logos(wordmark, mark_512 if False else icon_512)
    # Horizontal logo should use transparent icon mark beside wordmark for cleaner lockups
    compose_logos(wordmark, mark_512)

    # Favicon multi-size ico from mustard 256
    fav = Image.open(EXPORTS / "app-icon-mustard-256.png").convert("RGBA")
    fav.save(
        EXPORTS / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    # Copy wordmark as logo.png candidate (wordmark-only) — also keep horizontal
    wordmark.save(EXPORTS / "wordmark.png")

    print("Wrote branding exports to", EXPORTS)


if __name__ == "__main__":
    main()
