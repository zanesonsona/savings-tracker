#!/usr/bin/env python3
"""One-off PWA icon generator (T38).

Rasterizes the same emerald mark as `app/icon.svg` into the PNG sizes browsers
ask for. Pure Python + zlib keeps this out of `package.json` (no sharp/canvas
dependency) — run once with:

    python3 scripts/generate-icons.py
"""

from __future__ import annotations

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")

# app/icon.svg geometry, normalized to a 0…1 square.
POINTS = [
    (120 / 512, 338 / 512),
    (216 / 512, 234 / 512),
    (288 / 512, 306 / 512),
    (392 / 512, 146 / 512),
]
STROKE = 44 / 512
DOT = (392 / 512, 146 / 512)
DOT_RADIUS = 26 / 512

BG_START = (5, 150, 105)  # emerald-600
BG_END = (6, 78, 59)  # emerald-900
GLYPH = (236, 253, 245)  # emerald-50
DOT_COLOR = (167, 243, 208)  # emerald-200
SS = 3  # supersampling factor


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def background(x: float, y: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, (x + y) / 2))
    r = lerp(BG_START[0], BG_END[0], t)
    g = lerp(BG_START[1], BG_END[1], t)
    b = lerp(BG_START[2], BG_END[2], t)

    # Soft top-left glow so the square does not read as a flat block.
    distance = math.hypot(x - 0.24, y - 0.18)
    glow = max(0.0, 1.0 - distance / 0.55) * 0.1
    r += (GLYPH[0] - r) * glow
    g += (GLYPH[1] - g) * glow
    b += (GLYPH[2] - b) * glow
    return round(r), round(g), round(b)


def segment_distance(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> float:
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def glyph_color(x: float, y: float, scale: float) -> tuple[int, int, int] | None:
    # Transform into the unscaled glyph space so the whole mark (including the
    # stroke) shrinks for the maskable safe zone.
    gx = (x - 0.5) / scale + 0.5
    gy = (y - 0.5) / scale + 0.5

    if not (0.16 <= gx <= 0.85 and 0.22 <= gy <= 0.72):
        return None

    if math.hypot(gx - DOT[0], gy - DOT[1]) <= DOT_RADIUS:
        return DOT_COLOR

    radius = STROKE / 2
    for index in range(len(POINTS) - 1):
        ax, ay = POINTS[index]
        bx, by = POINTS[index + 1]
        if segment_distance(gx, gy, ax, ay, bx, by) <= radius:
            return GLYPH
    return None


def write_png(path: str, size: int, pixels: list[tuple[int, int, int]]) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type: none
        row = pixels[y * size : (y + 1) * size]
        for r, g, b in row:
            raw.extend((r, g, b))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )

    with open(path, "wb") as handle:
        handle.write(png)


def render(size: int, scale: float) -> list[tuple[int, int, int]]:
    pixels: list[tuple[int, int, int]] = []
    samples = SS * SS
    for py in range(size):
        for px in range(size):
            total_r = total_g = total_b = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / size
                    y = (py + (sy + 0.5) / SS) / size
                    color = glyph_color(x, y, scale)
                    if color is None:
                        color = background(x, y)
                    total_r += color[0]
                    total_g += color[1]
                    total_b += color[2]
            pixels.append(
                (
                    round(total_r / samples),
                    round(total_g / samples),
                    round(total_b / samples),
                )
            )
    return pixels


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        ("maskable-512.png", 512, 0.72),
        ("apple-touch-icon.png", 180, 1.0),
    ]
    for name, size, scale in targets:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, render(size, scale))
        print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    main()
