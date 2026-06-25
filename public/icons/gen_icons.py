from PIL import Image, ImageDraw
import os

BLUE = (37, 99, 235, 255)
WHITE = (255, 255, 255, 255)

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(96 * size / 512)

    # Blue rounded background
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BLUE)

    # House polygon (scaled from 512x512 coords)
    s = size / 512
    house = [
        (int(80 * s), int(258 * s)),
        (int(256 * s), int(82 * s)),
        (int(432 * s), int(258 * s)),
        (int(374 * s), int(258 * s)),
        (int(374 * s), int(418 * s)),
        (int(138 * s), int(418 * s)),
        (int(138 * s), int(258 * s)),
    ]
    draw.polygon(house, fill=WHITE)

    # Door (blue cutout)
    dx, dy, dw, dh = int(212*s), int(316*s), int(88*s), int(102*s)
    dr = max(2, int(14 * s))
    draw.rounded_rectangle([dx, dy, dx + dw - 1, dy + dh - 1], radius=dr, fill=BLUE)

    return img

out = os.path.dirname(os.path.abspath(__file__))

for sz, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    img = create_icon(sz)
    # For non-RGBA formats, flatten onto white (for apple-touch-icon)
    if name == "apple-touch-icon.png":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        bg.save(os.path.join(out, name), "PNG")
        print(f"Saved {name} ({sz}x{sz})")
    else:
        img.save(os.path.join(out, name), "PNG")
        print(f"Saved {name} ({sz}x{sz})")
