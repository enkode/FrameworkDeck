"""Generate a gear/cog icon for Framework Deck as PNG + ICO."""
import math, struct, zlib, os

def gear_mask(size, teeth=8, outer_r=0.48, inner_r=0.32, hub_r=0.12, tooth_h=0.12):
    """Return a 2D list of (r,g,b,a) tuples for a gear icon."""
    cx = cy = size / 2
    px = []
    for y in range(size):
        row = []
        for x in range(size):
            dx = (x - cx) / (size / 2)
            dy = (y - cy) / (size / 2)
            dist = math.hypot(dx, dy)
            angle = math.atan2(dy, dx)

            # Rotate so teeth are symmetric
            tooth_angle = (2 * math.pi) / teeth
            norm_angle = angle % tooth_angle
            t = norm_angle / tooth_angle  # 0..1 within one tooth period

            # Square wave blending for tooth vs valley
            tooth_width = 0.45
            in_tooth = (t < tooth_width or t > (1 - tooth_width))
            r_outer = outer_r + (tooth_h if in_tooth else 0)

            if dist < hub_r:
                # Hub hole (transparent)
                a = 0
            elif dist < inner_r:
                a = 255
            elif dist <= r_outer:
                a = 255
            else:
                a = 0

            if a > 0:
                # Cream color #e8e0d0 with slight shading based on y
                shade = 1.0 - 0.2 * (y / size)
                r = int(232 * shade)
                g = int(224 * shade)
                b = int(208 * shade)
                # Add highlight on top
                if dy < -0.1 and dist > hub_r + 0.05:
                    r = min(255, r + 30)
                    g = min(255, g + 30)
                    b = min(255, b + 30)
                row.append((r, g, b, a))
            else:
                row.append((0, 0, 0, 0))
        px.append(row)
    return px

def make_png(pixels):
    size = len(pixels)
    def png_chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)

    # IHDR: width(4) height(4) bitdepth(1) colortype(1) compression(1) filter(1) interlace(1)
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)

    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter type: none
        for r, g, b, a in row:
            raw += bytes([r, g, b, a])

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', ihdr_data)
    idat = png_chunk(b'IDAT', zlib.compress(raw, 9))
    iend = png_chunk(b'IEND', b'')
    return signature + ihdr + idat + iend

def make_ico(png_data_list):
    """Wrap PNG images into an ICO file."""
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
    px = gear_mask(s)
    pngs[s] = make_png(px)
    with open(os.path.join(out_dir, f'{s}x{s}.png'), 'wb') as f:
        f.write(pngs[s])
    print(f'Written {s}x{s}.png')

# ICO contains 16, 32, 48, 256
ico_sizes = [16, 32, 48, 256]
ico = make_ico([(s, pngs[s]) for s in ico_sizes])
with open(os.path.join(out_dir, 'icon.ico'), 'wb') as f:
    f.write(ico)
print('Written icon.ico')

# Also write 128x128@2x (just 256 renamed)
with open(os.path.join(out_dir, '128x128@2x.png'), 'wb') as f:
    f.write(pngs[256])
print('Written 128x128@2x.png')

print('Done.')
