"""Cut out the gargoyle Halloween's castle is decorated with (site/js/hwcastle.js).

source.png shows two gargoyles on pedestals, in black on white, with their reflection. The left
one, pedestal and all, is cropped, its darkness made the alpha of a black silhouette (the white
lines of its carving stay see-through), and it is scaled down: on the castle it is only a few
pixels high. Its eye, where the castle lights a red glint, is at EYE in the output's pixels.
Run it from the repository root (needs Pillow):

    python tools/gargoyle/cut.py
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "site" / "img" / "gargoyle.png"
CROP = (0, 0, 280, 306)  # the left gargoyle and its pedestal, in source pixels
WIDTH = 140              # twice its largest size on the castle, for sharp high-density screens


def main():
    photo = Image.open(HERE / "source.png").convert("RGBA").crop(CROP)
    lum = Image.new("RGB", photo.size, "white")
    lum.paste(photo, mask=photo.getchannel("A"))
    alpha = lum.convert("L").point(lambda v: max(0, min(255, int((255 - v) * 1.15))))
    out = Image.new("RGBA", photo.size, (0, 0, 0, 255))
    out.putalpha(alpha)
    height = round(photo.size[1] * WIDTH / photo.size[0])
    out.resize((WIDTH, height), Image.LANCZOS).save(OUT, optimize=True)


if __name__ == "__main__":
    main()
