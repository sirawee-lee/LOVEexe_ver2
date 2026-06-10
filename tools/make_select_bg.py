#!/usr/bin/env python3
"""
Compose a character-select background: left half = dog, right half = girl.
Target = game design resolution 960x640 (fitHeight).

Usage:
  python3 tools/make_select_bg.py \
      --left  assets/textures/select/dog.png \
      --right assets/textures/select/girl.png \
      --out   assets/textures/select/select_bg.png
"""
import argparse
from PIL import Image, ImageDraw

W, H = 960, 640          # game design resolution
HALF = W // 2            # 480 per side
DIVIDER = 4              # px width of the center divider line
DIVIDER_COLOR = (255, 255, 255, 230)


def cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Scale to fill (tw x th) keeping aspect, center-crop the overflow."""
    img = img.convert("RGBA")
    scale = max(tw / img.width, th / img.height)
    nw, nh = round(img.width * scale), round(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    x = (nw - tw) // 2
    y = (nh - th) // 2
    return img.crop((x, y, x + tw, y + th))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--left", required=True, help="image for left half (dog)")
    ap.add_argument("--right", required=True, help="image for right half (girl)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--divider", action="store_true", default=True)
    args = ap.parse_args()

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    left = cover(Image.open(args.left), HALF, H)
    right = cover(Image.open(args.right), HALF, H)
    canvas.paste(left, (0, 0), left)
    canvas.paste(right, (HALF, 0), right)

    if args.divider:
        d = ImageDraw.Draw(canvas)
        d.rectangle([HALF - DIVIDER // 2, 0, HALF + DIVIDER // 2, H],
                    fill=DIVIDER_COLOR)

    canvas.convert("RGB").save(args.out)
    print(f"wrote {args.out} ({W}x{H})")


if __name__ == "__main__":
    main()
