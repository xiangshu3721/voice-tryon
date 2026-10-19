"""
把 AI 生成的单品图（白底/浅灰底）抠成透明图，裁边、压缩成 WebP，
并从透明蒙版自动算出贴合锚点，写进 src/mirror/wardrobe.json。

用法：python scripts/build_garments.py <原图目录>
依赖：rembg、pillow、numpy（本地运行，不联网上传）
"""
import json
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/vt-gen')
OUT_DIR = ROOT / 'public' / 'garments'
OUT_JSON = ROOT / 'src' / 'mirror' / 'wardrobe.json'
MAX_SIDE = 760
LIMIT = 150 * 1024

# 风格：id、中文名、别名（指令里出现即命中）、依据
STYLES = {
    'female': [
        ('oldmoney', '老钱风', ['老钱', '静奢', '现代诗人', '高级感', '质感', '知性'], '淘宝教育《2026秋冬淘宝服饰白皮书》解读「现代诗人风」；逛淘宝「老钱风西装裤/阔腿裤」高销量'),
        ('newchinese', '新中式', ['新中式', '中式', '国风', '盘扣', '马面', '宋锦'], '逛淘宝「新中式轻商务」专题（2026-07）；天猫新中式搜索同比+100%（WWD China）'),
        ('plush', '美拉德绒感', ['美拉德', '绒感', '软雾', '毛茸茸', '温暖', '深焙棕', '焦糖'], '淘宝白皮书「软雾绒系」、天猫白皮书「温暖绒感/时髦绒感」、女装关键色「深焙棕」'),
        ('romantic', '华丽浪漫', ['浪漫', '法式', '约会', '蝴蝶结', '波点', '丝绒', '名流'], '天猫2026AW四大风格「华丽浪漫」、淘宝「华丽名流风」与「80年代浪漫：蝴蝶结/波点」元素'),
        ('snow', '雪后轻羽', ['运动', '户外', '羽绒', '滑雪', '轻羽', '雪', '松弛', '休闲'], '天猫白皮书「雪后轻羽」、淘天运动户外白皮书「松弛雪系」、泡芙/短款羽绒（知衣科技）'),
        ('sharp', '时髦通勤', ['通勤', '上班', '职场', '极简', '干练', '野心家', '塑形', '面试'], '淘宝白皮书「时髦野心家」、天猫「功能塑形/塑形主义：宽肩窄腰」'),
    ],
    'male': [
        ('quiet', '质感静奢', ['老钱', '静奢', '质感', '高级', '商务', '绅士'], '淘天运动户外白皮书「质感静奢」；淘宝/京东 2026 秋冬「老钱风 POLO 毛衣」新品'),
        ('maillard', '美拉德复古', ['美拉德', '棕色系', '复古', '秋天', '麂皮', '巧克力'], '识货社区 2026-09 美拉德棕夹克笔记；逛淘宝美拉德麂皮立领夹克高销量；男装关键色「巧克力软糖」'),
        ('newchinese', '新中式轻商务', ['新中式', '中式', '国风', '唐装', '盘扣', '立领'], '逛淘宝「新中式轻商务：唐装夹克+素色直筒裤+棉麻衬衫」专题（2026-07）'),
        ('outdoor', '户外游牧', ['户外', '冲锋衣', '徒步', '游牧', '机能', '运动', '露营'], '淘天《2026秋冬运动户外鞋服趋势白皮书》「户外游牧：轻量冲锋衣、抓绒、防泼水登山裤」'),
        ('retro', '跃动复古', ['美式', '棒球', '学院', '街头', '跃动', '卫衣'], '淘天运动户外白皮书「跃动复古：复古棒球服」；Vogue 2026秋冬男装「纯白丹宁」'),
        ('cityk', '日韩轻野', ['韩系', '日系', '日韩', '轻野', '工装', '面包服'], '淘天运动户外白皮书「日韩轻野：工装羽绒服、工装裤」；男装关键色「陶土蓝」'),
    ],
}

# file, 名字, 风格, 类别, 颜色(ColorId), 颜色中文, 长度, 关键词
ITEMS = [
    ('f-oldmoney-coat', '燕麦色双面呢大衣', 'female', 'oldmoney', 'outer', 'oat', '燕麦色', 'knee', ['大衣', '毛呢大衣', '双面呢', '长外套', '宽肩']),
    ('f-oldmoney-knit', '奶白半高领羊绒衫', 'female', 'oldmoney', 'top', 'cream', '奶白色', 'hip', ['羊绒衫', '针织衫', '毛衣', '半高领', '打底']),
    ('f-oldmoney-trousers', '浅灰垂感西装阔腿裤', 'female', 'oldmoney', 'bottom', 'gray', '灰色', 'ankle', ['西装裤', '西裤', '阔腿裤', '垂感裤', '裤子']),
    ('f-chinese-jacket', '墨绿宋锦盘扣外套', 'female', 'newchinese', 'outer', 'green', '墨绿色', 'hip', ['盘扣外套', '宋锦', '立领外套', '外套', '中式外套']),
    ('f-chinese-top', '米白苎麻斜襟上衣', 'female', 'newchinese', 'top', 'cream', '米白色', 'hip', ['斜襟', '盘扣上衣', '苎麻', '衬衫', '上衣', '茶服']),
    ('f-chinese-skirt', '酒红织金马面裙', 'female', 'newchinese', 'bottom', 'burgundy', '酒红色', 'calf', ['马面裙', '半裙', '半身裙', '长裙', '裙子']),
    ('f-plush-jacket', '深焙棕泰迪绒短外套', 'female', 'plush', 'outer', 'brown', '棕色', 'hip', ['泰迪绒', '羊羔毛', '毛绒外套', '短外套', '外套']),
    ('f-plush-sweater', '焦糖麻花毛衣', 'female', 'plush', 'top', 'camel', '焦糖色', 'hip', ['麻花毛衣', '毛衣', '针织衫', '粗针']),
    ('f-plush-corduroy', '巧克力灯芯绒直筒裤', 'female', 'plush', 'bottom', 'brown', '咖啡色', 'ankle', ['灯芯绒', '直筒裤', '裤子', '长裤']),
    ('f-romantic-dress', '酒红丝绒蝴蝶结连衣裙', 'female', 'romantic', 'dress', 'burgundy', '酒红色', 'calf', ['丝绒裙', '蝴蝶结', '连衣裙', '裙子', '长裙']),
    ('f-romantic-blouse', '蕾丝娃娃领白衬衫', 'female', 'romantic', 'top', 'white', '白色', 'hip', ['蕾丝', '娃娃领', '泡泡袖', '衬衫', '白衬衫', '上衣']),
    ('f-romantic-skirt', '黑白波点缎面半裙', 'female', 'romantic', 'bottom', 'black', '黑白', 'calf', ['波点', '缎面', '半裙', '半身裙', '裙子']),
    ('f-snow-puffer', '粉底色短款泡芙羽绒服', 'female', 'snow', 'outer', 'pink', '粉色', 'hip', ['羽绒服', '泡芙羽绒', '面包服', '短款羽绒', '外套']),
    ('f-snow-fleece', '云白摇粒绒半拉链', 'female', 'snow', 'top', 'white', '白色', 'hip', ['摇粒绒', '抓绒', '半拉链', '卫衣', '上衣']),
    ('f-snow-flare', '黑色高腰喇叭瑜伽裤', 'female', 'snow', 'bottom', 'black', '黑色', 'ankle', ['喇叭裤', '瑜伽裤', '运动裤', '裤子']),
    ('f-sharp-blazer', '黑色宽肩收腰西装', 'female', 'sharp', 'outer', 'black', '黑色', 'hip', ['西装', '西装外套', '西服', '宽肩', '外套']),
    ('f-sharp-shirt', '白色廓形衬衫', 'female', 'sharp', 'top', 'white', '白色', 'hip', ['衬衫', '白衬衫', '衬衣', '上衣']),
    ('f-sharp-wideleg', '黑色高腰阔腿裤', 'female', 'sharp', 'bottom', 'black', '黑色', 'ankle', ['阔腿裤', '西装裤', '西裤', '裤子', '长裤']),
    ('m-quiet-coat', '驼色羊毛大衣', 'male', 'quiet', 'outer', 'camel', '驼色', 'knee', ['大衣', '羊毛大衣', '长外套', '外套']),
    ('m-quiet-polo', '浅杏POLO领针织衫', 'male', 'quiet', 'top', 'beige', '杏色', 'hip', ['polo', 'POLO', '针织衫', '毛衣', '翻领']),
    ('m-quiet-trousers', '炭灰羊毛西裤', 'male', 'quiet', 'bottom', 'gray', '灰色', 'ankle', ['西裤', '西装裤', '羊毛裤', '裤子', '长裤']),
    ('m-maillard-jacket', '美拉德麂皮哈灵顿夹克', 'male', 'maillard', 'outer', 'brown', '棕色', 'hip', ['麂皮', '哈灵顿', '夹克', '立领夹克', '外套']),
    ('m-maillard-waffle', '奶白华夫格亨利衫', 'male', 'maillard', 'top', 'cream', '奶白色', 'hip', ['华夫格', '亨利衫', '长袖T恤', 't恤', 'T恤', '打底']),
    ('m-maillard-corduroy', '深棕灯芯绒直筒裤', 'male', 'maillard', 'bottom', 'brown', '棕色', 'ankle', ['灯芯绒', '直筒裤', '裤子', '长裤']),
    ('m-chinese-jacket', '黑色盘扣唐装夹克', 'male', 'newchinese', 'outer', 'black', '黑色', 'hip', ['唐装', '盘扣', '立领夹克', '夹克', '外套']),
    ('m-chinese-shirt', '白色立领棉麻衬衫', 'male', 'newchinese', 'top', 'white', '白色', 'hip', ['立领衬衫', '棉麻', '亚麻衬衫', '衬衫', '上衣']),
    ('m-chinese-trousers', '黑色垂感直筒裤', 'male', 'newchinese', 'bottom', 'black', '黑色', 'ankle', ['直筒裤', '垂感裤', '裤子', '长裤', '阔腿裤']),
    ('m-outdoor-shell', '垂柳绿轻量冲锋衣', 'male', 'outdoor', 'outer', 'green', '绿色', 'hip', ['冲锋衣', '风衣', '软壳', '夹克', '外套']),
    ('m-outdoor-fleece', '燕麦抓绒半拉链', 'male', 'outdoor', 'top', 'oat', '燕麦色', 'hip', ['抓绒', '摇粒绒', '半拉链', '卫衣', '上衣']),
    ('m-outdoor-pants', '黑色防泼水登山裤', 'male', 'outdoor', 'bottom', 'black', '黑色', 'ankle', ['登山裤', '机能裤', '运动裤', '裤子']),
    ('m-retro-varsity', '藏青复古棒球服', 'male', 'retro', 'outer', 'navy', '藏青色', 'hip', ['棒球服', '棒球夹克', '夹克', '外套']),
    ('m-retro-hoodie', '麻灰连帽卫衣', 'male', 'retro', 'top', 'gray', '灰色', 'hip', ['卫衣', '连帽卫衣', '帽衫', '上衣']),
    ('m-retro-whitejeans', '纯白宽松牛仔裤', 'male', 'retro', 'bottom', 'white', '白色', 'ankle', ['牛仔裤', '白牛仔', '丹宁', '裤子']),
    ('m-korean-puffer', '黑色工装面包服', 'male', 'cityk', 'outer', 'black', '黑色', 'hip', ['面包服', '羽绒服', '工装羽绒', '短款羽绒', '外套']),
    ('m-korean-denimshirt', '陶土蓝做旧牛仔衬衫', 'male', 'cityk', 'top', 'blue', '蓝色', 'hip', ['牛仔衬衫', '衬衫', '丹宁', '上衣']),
    ('m-korean-cargo', '卡其宽松工装裤', 'male', 'cityk', 'bottom', 'khaki', '卡其色', 'ankle', ['工装裤', '工装', '阔腿裤', '裤子']),
]


def rows_extent(mask):
    ys = np.where(mask.any(axis=1))[0]
    xs = np.where(mask.any(axis=0))[0]
    return ys[0], ys[-1], xs[0], xs[-1]


def row_span(mask, y):
    xs = np.where(mask[y])[0]
    if len(xs) == 0:
        return None
    return xs[0], xs[-1]


# 少数单品自动拐点会被帽子骗到，手动指定肩线高度（相对高度）
OVERRIDES = {'m-retro-hoodie': {'shoulder_y': 0.25}}


def anchors_upper(mask, override=None):
    h, w = mask.shape
    widths = np.array([(lambda s: (s[1] - s[0]) if s else 0)(row_span(mask, y)) for y in range(h)])
    top_half = widths[: int(h * 0.5)]
    wmax = top_half.max()
    # 肩：外轮廓上的「拐点」。取轮廓最上端到 45% 高度处的弦，离弦最远的轮廓点就是肩头。
    y_top = int(np.argmax(widths > 0))
    y_bot = int(h * 0.45)
    def knee(side):
        ys = []
        xs = []
        for y in range(y_top, y_bot):
            sp = row_span(mask, y)
            if not sp:
                continue
            ys.append(y)
            xs.append(sp[0] if side == 'l' else sp[1])
        ys = np.array(ys, float)
        xs = np.array(xs, float)
        x0, y0, x1, y1 = xs[0], ys[0], xs[-1], ys[-1]
        dx, dy = x1 - x0, y1 - y0
        n = np.hypot(dx, dy) or 1
        d = np.abs(dy * (xs - x0) - dx * (ys - y0)) / n
        return int(ys[int(np.argmax(d))])
    y_sh = int(round((knee('l') + knee('r')) / 2))
    if override and 'shoulder_y' in override:
        y_sh = int(h * override['shoulder_y'])
    l, r = row_span(mask, y_sh)
    sw = r - l
    inset = sw * 0.07
    sh_l = l + inset
    sh_r = r - inset
    shoulder_w = sh_r - sh_l
    # 胯线：肩下约 1.1 个肩宽（与人体比例一致），短款会在下摆以外，按比例外推
    y_hip = y_sh + shoulder_w * 1.1
    hip_l = sh_l + shoulder_w * 0.05
    hip_r = sh_r - shoulder_w * 0.05
    # 领口：中线附近最上面的布料
    cx = w / 2
    band = mask[:, int(cx - w * 0.04): int(cx + w * 0.04)]
    neck_y = int(np.argmax(band.any(axis=1)))
    hem_y = int(np.where(mask[:, int(cx)])[0].max()) if mask[:, int(cx)].any() else h - 1
    waist_y = y_sh + (y_hip - y_sh) * 0.62
    return {
        'neck': (cx, neck_y),
        'shoulderL': (sh_l, y_sh),
        'shoulderR': (sh_r, y_sh),
        'waist': (cx, waist_y),
        'hipL': (hip_l, y_hip),
        'hipR': (hip_r, y_hip),
        'hem': (cx, hem_y),
    }


def anchors_lower(mask):
    h, w = mask.shape
    y0, y1, _, _ = rows_extent(mask)
    yw = int(y0 + (y1 - y0) * 0.02)
    wl, wr = row_span(mask, yw)
    yh = int(y0 + (y1 - y0) * 0.16)
    hl, hr = row_span(mask, yh)
    ye = int(y1 - (y1 - y0) * 0.015)
    spans = [row_span(mask, y) for y in range(int(y1 - (y1 - y0) * 0.06), y1 + 1)]
    spans = [sp for sp in spans if sp]
    el = min(sp[0] for sp in spans)
    er = max(sp[1] for sp in spans)
    return {
        'waist': ((wl + wr) / 2, yw),
        'waistL': (wl, yw),
        'waistR': (wr, yw),
        'hipL': (hl, yh),
        'hipR': (hr, yh),
        'hemL': (el, ye),
        'hemR': (er, ye),
        'hem': ((el + er) / 2, ye),
    }


def save_webp(img):
    for q in (82, 76, 70, 62, 55, 48):
        buf = BytesIO()
        img.save(buf, 'WEBP', quality=q, method=6, alpha_quality=80)
        if buf.tell() <= LIMIT:
            return buf.getvalue(), q
    return buf.getvalue(), q


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = new_session('u2net')
    items = []
    for file, name, gender, style, cat, color, color_name, length, keywords in ITEMS:
        src = SRC / f'{file}.jpg'
        im = Image.open(src).convert('RGB')
        cut = remove(im, session=session, post_process_mask=True)
        alpha = np.array(cut.split()[-1])
        mask = alpha > 140
        # 去掉零星噪点：只保留足够大的连通块（简单做法：按行列占比裁）
        y0, y1, x0, x1 = rows_extent(mask)
        pad = 6
        box = (max(0, x0 - pad), max(0, y0 - pad), min(cut.width, x1 + pad + 1), min(cut.height, y1 + pad + 1))
        cut = cut.crop(box)
        scale = min(1.0, MAX_SIDE / max(cut.size))
        if scale < 1:
            cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
        a = np.array(cut.split()[-1]) > 140
        anchors_px = anchors_upper(a, OVERRIDES.get(file)) if cat in ('top', 'outer', 'dress') else anchors_lower(a)
        W, H = cut.size
        anchors = {k: {'x': round(v[0] / W, 4), 'y': round(v[1] / H, 4)} for k, v in anchors_px.items()}
        data, q = save_webp(cut)
        out = OUT_DIR / f'{file}.webp'
        out.write_bytes(data)
        print(f'{file}: {W}x{H} q={q} {len(data)//1024}KB')
        items.append({
            'id': file,
            'name': name,
            'gender': gender,
            'style': style,
            'category': cat,
            'color': color,
            'colorName': color_name,
            'length': length,
            'keywords': keywords,
            'image': f'garments/{file}.webp',
            'size': {'w': W, 'h': H},
            'anchors': anchors,
        })
    styles = {
        g: [{'id': s, 'name': n, 'aliases': a, 'source': src} for s, n, a, src in lst]
        for g, lst in STYLES.items()
    }
    OUT_JSON.write_text(json.dumps({'version': 1, 'styles': styles, 'items': items}, ensure_ascii=False, indent=1) + '\n')
    print('wrote', OUT_JSON, len(items))


if __name__ == '__main__':
    main()
