"""开发用：把锚点画在单品图上，检查自动锚点。"""
import json, sys
from PIL import Image, ImageDraw
d = json.load(open('src/mirror/wardrobe.json'))
cats = sys.argv[2].split(',') if len(sys.argv) > 2 else ['top', 'outer', 'dress']
items = [i for i in d['items'] if i['category'] in cats]
cell, cols = 260, 6
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * cell), (236, 230, 220))
for i, it in enumerate(items):
    im = Image.open('public/' + it['image']).convert('RGBA')
    s = min((cell - 10) / im.width, (cell - 10) / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)))
    dr = ImageDraw.Draw(im)
    for k, p in it['anchors'].items():
        x, y = p['x'] * im.width, p['y'] * im.height
        c = (220, 30, 30, 255) if 'shoulder' in k else (30, 90, 220, 255) if 'hip' in k else (20, 160, 60, 255)
        dr.ellipse([x - 4, y - 4, x + 4, y + 4], fill=c)
    ox = (i % cols) * cell + (cell - im.width) // 2
    oy = (i // cols) * cell + (cell - im.height) // 2
    sheet.paste(im, (ox, oy), im)
sheet.save(sys.argv[1])
