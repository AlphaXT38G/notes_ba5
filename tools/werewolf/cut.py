"""Cut Halloween's werewolf (site/js/hwwolf.js) into the layers it moves by.

source.png is the werewolf in black on white. Its darkness becomes the alpha of a black
silhouette, then each moving part is cut out along an outline drawn here in source pixels: the
body loses that part, and the part keeps a little more, reaching under the body at its joint,
so a turn of it never opens a gap (black on black, the overlap does not show). Every layer keeps
the size of the photo, so they stack exactly. Run it from the repository root (needs Pillow):

    python tools/werewolf/cut.py

It writes site/img/werewolf/<part>.png. The pivots of the parts are in css/halloween.css.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "site" / "img" / "werewolf"
# Each part's outline, and how far its joint reaches under the body (dx, dy)
PARTS = {
    "head": ([(40, 0), (300, 0), (300, 100), (215, 128), (120, 118), (70, 60)], (0, 8)),
    "arm-l": ([(0, 140), (150, 140), (175, 225), (150, 270), (40, 270), (0, 240)], (22, 0)),
    "arm-r": ([(298, 128), (420, 128), (420, 255), (300, 255), (292, 175)], (-22, 0)),
    "tail": ([(338, 262), (469, 262), (469, 430), (395, 430), (342, 330)], (-24, 0)),
    "leg-l": ([(30, 398), (205, 390), (205, 512), (30, 512)], (0, -26)),
    "leg-r": ([(300, 392), (430, 392), (430, 512), (300, 512)], (0, -26)),
}


def main():
    photo = Image.open(HERE / "source.png").convert("RGBA")
    size = photo.size
    # darkness as alpha: white is transparent, black opaque, the soft edges kept
    lum = Image.new("RGB", size, "white")
    lum.paste(photo, mask=photo.getchannel("A"))
    alpha = lum.convert("L").point(lambda v: max(0, min(255, int((255 - v) * 1.15))))
    black = Image.new("RGBA", size, (0, 0, 0, 255))

    def outline(points):
        mask = Image.new("L", size)
        ImageDraw.Draw(mask).polygon(points, fill=255)
        return mask

    OUT.mkdir(parents=True, exist_ok=True)
    body = alpha.copy()
    for name, (points, (dx, dy)) in PARTS.items():
        mask = outline(points)
        body = ImageChops.subtract(body, mask)
        reach = ImageChops.lighter(mask, outline([(x + dx, y + dy) for x, y in points]))
        layer = black.copy()
        layer.putalpha(ImageChops.multiply(alpha, reach))
        layer.save(OUT / f"{name}.png", optimize=True)
    layer = black.copy()
    layer.putalpha(body)
    layer.save(OUT / "body.png", optimize=True)


if __name__ == "__main__":
    main()
