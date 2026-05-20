from pathlib import Path
import sys

from PIL import Image, ImageDraw

sys.dont_write_bytecode = True


SIZE = 96
SCALE = 4
CANVAS = SIZE * SCALE
OUTPUT_DIR = Path("assets/tabbar")

DEFAULT_COLOR = (176, 184, 197, 255)
SELECTED_COLOR = (75, 142, 255, 255)
SELECTED_BG = (75, 142, 255, 42)


def px(value: float) -> int:
    return round(value * SCALE)


def new_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def rounded(draw: ImageDraw.ImageDraw, box, radius: float, **kwargs) -> None:
    scaled_box = tuple(px(value) for value in box)
    draw.rounded_rectangle(scaled_box, radius=px(radius), **kwargs)


def circle(draw: ImageDraw.ImageDraw, center_x: float, center_y: float, radius: float, fill) -> None:
    draw.ellipse(
        (
            px(center_x - radius),
            px(center_y - radius),
            px(center_x + radius),
            px(center_y + radius),
        ),
        fill=fill,
    )


def add_selected_bg(draw: ImageDraw.ImageDraw) -> None:
    rounded(draw, (18, 12, 78, 72), 18, fill=SELECTED_BG)


def export(image: Image.Image, filename: str) -> None:
    resized = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    resized.save(OUTPUT_DIR / filename)


def draw_home1(color, selected: bool) -> Image.Image:
    image, draw = new_canvas()
    if selected:
        add_selected_bg(draw)

    rounded(draw, (22, 20, 74, 32), 6, fill=color)
    rounded(draw, (22, 42, 46, 66), 7, fill=color)
    rounded(draw, (50, 42, 74, 66), 7, fill=color)
    return image


def draw_home2(color, selected: bool) -> Image.Image:
    image, draw = new_canvas()
    if selected:
        add_selected_bg(draw)

    for left, top in ((22, 20), (50, 20), (22, 48), (50, 48)):
        rounded(draw, (left, top, left + 24, top + 24), 7, fill=color)
    return image


def draw_fixed(color, selected: bool) -> Image.Image:
    image, draw = new_canvas()
    if selected:
        add_selected_bg(draw)

    rounded(draw, (20, 20, 76, 68), 10, outline=color, width=px(5))
    rounded(draw, (30, 30, 66, 36), 3, fill=color)
    rounded(draw, (30, 46, 56, 52), 3, fill=color)
    rounded(draw, (30, 58, 48, 64), 3, fill=color)
    return image


def draw_settings(color, selected: bool) -> Image.Image:
    image, draw = new_canvas()
    if selected:
        add_selected_bg(draw)

    rails = (
        (20, 24, 76, 30),
        (20, 44, 76, 50),
        (20, 64, 76, 70),
    )
    for rail in rails:
        rounded(draw, rail, 3, fill=color)

    circle(draw, 34, 27, 8, color)
    circle(draw, 58, 47, 8, color)
    circle(draw, 42, 67, 8, color)
    return image


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    icon_builders = {
        "home1": draw_home1,
        "home2": draw_home2,
        "fixed": draw_fixed,
        "settings": draw_settings,
    }

    for name, builder in icon_builders.items():
        export(builder(DEFAULT_COLOR, False), f"{name}-default.png")
        export(builder(SELECTED_COLOR, True), f"{name}-selected.png")


if __name__ == "__main__":
    main()
