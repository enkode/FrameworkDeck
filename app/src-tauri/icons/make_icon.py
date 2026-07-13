"""Generate the Framework Deck app icon: black gear on the tan rounded tile.

Matches the in-app nav-rail mark (black cog on #c09060, radius 6/32 of tile).
Dependency-free: writes PNGs + ICO by hand. 3x3 supersampling for clean edges.
"""
import math, struct, zlib, os

TAN = (0xC0, 0x90, 0x60)
BLACK = (0x0A, 0x0A, 0x0A)

# Normalized geometry (coordinates in [-1, 1] across the tile)
CORNER_R = 0.375   # rounded-rect corner radius (6/32 tile = 0.375 of half-size)
MARGIN = 0.0       # tile fills the canvas
TEETH = 8
GEAR_OUTER = 0.36  # gear body radius
TOOTH_H = 0.12     # teeth extend beyond the body
HUB_R = 0.15       # center hole (tan shows through)
TOOTH_WIDTH = 0.42 # fraction of one tooth period that is tooth


def inside_rounded_rect(dx, dy):
    ext = 1.0 - MARGIN
    ax, ay = abs(dx), abs(dy)
    if ax > ext or ay > ext:
        return False
    ix = ext - CORNER_R
    if ax <= ix or ay <= ix:
        return True
    return math.hypot(ax - ix, ay - ix) <= CORNER_R


def inside_gear(dx, dy):
    dist = math.hypot(dx, dy)
    if dist < HUB_R:
        return False
    if dist <= GEAR_OUTER:
        return True
    angle = math.atan2(dy, dx)
    tooth_angle = (2 * math.pi) / TEETH
    t = (angle % tooth_angle) / tooth_angle
    in_tooth = t < TOOTH_WIDTH or t > (1 - TOOTH_WIDTH)
    return in_tooth and dist <= GEAR_OUTER + TOOTH_H


def tile_pixels(size, ss=3):
    """RGBA rows, supersampled ss*ss per pixel."""
    px = []
    step = 2.0 / (size * ss)
    for y in range(size):
        row = []
        for x in range(size):
            rect_hits = 0
            gear_hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    dx = -1.0 + (x * ss + sx + 0.5) * step
                    dy = -1.0 + (y * ss + sy + 0.5) * step
                    if inside_rounded_rect(dx, dy):
                        rect_hits += 1
                        if inside_gear(dx, dy):
                            gear_hits += 1
            total = ss * ss
            if rect_hits == 0:
                row.append((0, 0, 0, 0))
                continue
            a = round(255 * rect_hits / total)
            g_frac = gear_hits / rect_hits
            r = round(BLACK[0] * g_frac + TAN[0] * (1 - g_frac))
            g = round(BLACK[1] * g_frac + TAN[1] * (1 - g_frac))
            b = round(BLACK[2] * g_frac + TAN[2] * (1 - g_frac))
            row.append((r, g, b, a))
        px.append(row)
    return px


def make_png(pixels):
    size = len(pixels)
    def png_chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)

    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', ihdr_data)
    idat = png_chunk(b'IDAT', zlib.compress(raw, 9))
    iend = png_chunk(b'IEND', b'')
    return signature + ihdr + idat + iend


def make_ico(png_data_list):
    count = len(png_data_list)
    header = struct.pack('<HHH', 0, 1, count)
    offset = 6 + 16 * count
    dirs = b''
    for size, png in png_data_list:
        w = h = 0 if size == 256 else size  # 0 means 256 in ICO spec
        dirs += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(png), offset)
        offset += len(png)
    data = b''.join(d for _, d in png_data_list)
    return header + dirs + data


out_dir = os.path.dirname(os.path.abspath(__file__))

sizes = [16, 32, 48, 128, 256]
pngs = {}
for s in sizes:
    pngs[s] = make_png(tile_pixels(s))
    with open(os.path.join(out_dir, f'{s}x{s}.png'), 'wb') as f:
        f.write(pngs[s])
    print(f'Written {s}x{s}.png')

ico = make_ico([(s, pngs[s]) for s in [16, 32, 48, 256]])
with open(os.path.join(out_dir, 'icon.ico'), 'wb') as f:
    f.write(ico)
print('Written icon.ico')

with open(os.path.join(out_dir, '128x128@2x.png'), 'wb') as f:
    f.write(pngs[256])
print('Written 128x128@2x.png')

print('Done.')
