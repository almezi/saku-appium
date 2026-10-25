#!/usr/bin/env python3
"""WCAG contrast checker for Saku screenshots.

Usage: contrast_check.py <screenshot.png> <x1,y1,x2,y2> [<x1,y1,x2,y2> ...]
Each region is a text element's bounds from the UI dump. The background is
the most common pixel color in the region; text pixels are those whose
per-channel distance from it exceeds 90. Prints the WCAG ratio per region
and PASS/FAIL against the 4.5:1 body-text threshold.

Method note: `sips -s format bmp` first (macOS), pixels are decoded in pure
python — no PIL dependency. Verified live on the Tambah screen (v2.2):
labels/helper 6.77-6.85:1 (dark theme).
"""
import struct
import sys
from collections import Counter


def load_bmp(path):
    d = open(path, 'rb').read()
    off = struct.unpack('<I', d[10:14])[0]
    w = struct.unpack('<i', d[18:22])[0]
    h = struct.unpack('<i', d[22:26])[0]
    bpp = struct.unpack('<H', d[28:30])[0]
    row = ((w * bpp + 31) // 32) * 4
    px = [[None] * w for _ in range(abs(h))]
    for r in range(abs(h)):
        y = h - 1 - r if h > 0 else r
        base = off + r * row
        for x in range(w):
            i = base + x * bpp // 8
            px[y][x] = (d[i + 2], d[i + 1], d[i])
    return w, abs(h), px


def rel_lum(c):
    def ch(u):
        u /= 255
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(a, b):
    l1, l2 = sorted((rel_lum(a), rel_lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def main():
    png, *regions = sys.argv[1:]
    bmp = png.replace('.png', '.bmp')
    subprocess = __import__('subprocess')
    subprocess.run(['sips', '-s', 'format', 'bmp', png, '--out', bmp],
                   check=True, capture_output=True)
    _, _, px = load_bmp(bmp)
    failures = 0
    for region in regions:
        x1, y1, x2, y2 = map(int, region.split(','))
        reg = [px[y][x] for y in range(y1, y2) for x in range(x1, x2)]
        bg = Counter(reg).most_common(1)[0][0]
        tx = sorted((c for c in reg
                     if sum(abs(c[i] - bg[i]) for i in range(3)) > 90),
                    key=sum)
        if not tx:
            print(f'{region}: no text pixels found')
            failures += 1
            continue
        t = tx[len(tx) // 2]
        r = ratio(t, bg)
        ok = r >= 4.5
        failures += 0 if ok else 1
        print(f'{region}: bg={bg} text={t} ratio={r:.2f} '
              f'{"PASS" if ok else "FAIL"}')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
