#!/usr/bin/env python
# 生成 阅栈 ReadStack 的 PWA 图标（纯 Python，无第三方依赖）
import zlib, struct, math, os

OUT = os.path.join(os.path.dirname(__file__), "assets", "icons")
os.makedirs(OUT, exist_ok=True)

# 主题色（与 theme.css 一致）
C1 = (169, 211, 255, 255)  # #A9D3FF
C2 = (198, 200, 255, 255)  # #C6C8FF
MIDZ = 0.46
C3 = (255, 192, 221, 255)  # #FFC0DD

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))

def grad(x, y, S):
    t = (x + y) / (2 * S)
    if t < MIDZ:
        return lerp(C1, C2, t / MIDZ)
    return lerp(C2, C3, (t - MIDZ) / (1 - MIDZ))

def make_img(N, ss, glyph_scale):
    S = ss * N
    big = [None] * (S * S)
    for y in range(S):
        for x in range(S):
            big[y * S + x] = grad(x, y, S)
    # 画圆角矩形（书堆 glyph）
    def round_rect(x0, y0, x1, y1, r, color):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                if x < 0 or y < 0 or x >= S or y >= S:
                    continue
                ix, iy = x, y
                if ix < x0 + r and iy < y0 + r:
                    if (ix - (x0 + r)) ** 2 + (iy - (y0 + r)) ** 2 > r * r:
                        continue
                elif ix > x1 - r and iy < y0 + r:
                    if (ix - (x1 - r)) ** 2 + (iy - (y0 + r)) ** 2 > r * r:
                        continue
                elif ix < x0 + r and iy > y1 - r:
                    if (ix - (x0 + r)) ** 2 + (iy - (y1 - r)) ** 2 > r * r:
                        continue
                elif ix > x1 - r and iy > y1 - r:
                    if (ix - (x1 - r)) ** 2 + (iy - (y1 - r)) ** 2 > r * r:
                        continue
                big[y * S + x] = color
    cx = S / 2
    bookW = 0.46 * S * glyph_scale
    bookH = 0.072 * S * glyph_scale
    gap = 0.034 * S * glyph_scale
    r = bookH * 0.42
    totalH = 3 * bookH + 2 * gap
    y0 = (S - totalH) / 2
    offsets = [0.0, 0.035 * S * glyph_scale, -0.022 * S * glyph_scale]
    white = (255, 255, 255, 236)
    for i in range(3):
        bx = cx - bookW / 2 + offsets[i]
        by = y0 + i * (bookH + gap)
        round_rect(bx, by, bx + bookW, by + bookH, r, white)
    # 顶部书的小书签（粉色方点）作为点缀
    tabS = bookH * 0.5
    tx = cx + bookW / 2 - 0.06 * S * glyph_scale
    ty = y0 - tabS * 0.4
    round_rect(tx, ty, tx + tabS, ty + tabS, tabS * 0.28, (255, 150, 196, 255))
    # 降采样到 N
    out = [[None] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            r_ = g_ = b_ = a_ = 0
            s = 0
            for dy in range(ss):
                for dx in range(ss):
                    c = big[(y * ss + dy) * S + (x * ss + dx)]
                    r_ += c[0]; g_ += c[1]; b_ += c[2]; a_ += c[3]; s += 1
            out[y][x] = (r_ // s, g_ // s, b_ // s, a_ // s)
    return out

def write_png(path, img, N):
    raw = bytearray()
    for row in img:
        raw.append(0)
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))
    comp = zlib.compress(bytes(raw), 9)
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", comp))
        f.write(chunk(b"IEND", b""))

for N in (192, 512):
    write_png(os.path.join(OUT, f"icon-{N}.png"), make_img(N, 2, 1.0), N)
    print("wrote icon-%d.png" % N)
# maskable：全出血 + glyph 收在安全区
write_png(os.path.join(OUT, "icon-maskable-512.png"), make_img(512, 2, 0.62), 512)
print("wrote icon-maskable-512.png")
