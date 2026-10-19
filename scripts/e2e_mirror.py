import sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4180/voice-tryon/'
SH = '/workspace/voice-tryon-shots'
res = []
def ok(n, c, i=''):
    res.append(c); print('PASS' if c else 'FAIL', n, str(i)[:200], flush=True)

def run(p, video, vp, mobile, gender, cmds, tag):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={video}', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, has_touch=mobile, is_mobile=mobile, permissions=['camera'], accept_downloads=True)
    pg = ctx.new_page(); errs = []; ext = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if not r.url.startswith(('http://localhost', 'blob:', 'data:')) else None)
    pg.goto(BASE); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{SH}/{tag}-0-intro.png')
    pg.click('[data-testid=start-camera]')
    st = pg.locator('[data-testid=mirror-stage]')
    t0 = time.time()
    while time.time() - t0 < 90 and st.get_attribute('data-model') not in ('ready', 'error'): pg.wait_for_timeout(500)
    ok(f'{tag} 模型加载', st.get_attribute('data-model') == 'ready', f'{time.time()-t0:.1f}s')
    t0 = time.time()
    while time.time() - t0 < 30 and st.get_attribute('data-person') != 'ok': pg.wait_for_timeout(300)
    ok(f'{tag} 检测到人', st.get_attribute('data-person') == 'ok', st.get_attribute('data-person'))
    pg.click(f'[data-testid=gender-{gender}]'); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{SH}/{tag}-1-look.png')
    for i, c in enumerate(cmds):
        pg.fill('[data-testid=composer-input]', c); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
        ok(f'{tag} 指令「{c}」', '没接住' not in pg.inner_text('[data-testid=reply]'), pg.inner_text('[data-testid=reply]') + ' / ' + pg.inner_text('[data-testid=stage-caption]'))
        pg.screenshot(path=f'{SH}/{tag}-{i+2}-cmd.png')
    tile = pg.locator('.garment-tile[aria-pressed=false]').first; tid = tile.get_attribute('data-testid'); tile = pg.locator(f'[data-testid={tid}]'); tile.click(); pg.wait_for_timeout(800)
    ok(f'{tag} 点衣柜换装', tile.get_attribute('aria-pressed') == 'true')
    with pg.expect_download() as d: pg.click('[data-testid=shutter]')
    path = f'{SH}/{tag}-photo.png'; d.value.save_as(path)
    ok(f'{tag} 拍照存 PNG', open(path, 'rb').read(8) == b'\x89PNG\r\n\x1a\n', d.value.suggested_filename)
    ok(f'{tag} 无页面报错', not errs, errs)
    ok(f'{tag} 无外部请求', not ext, ext[:3])
    b.close()

def denied(p):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-fake-device-for-media-stream'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.goto(BASE); pg.click('[data-testid=start-camera]'); pg.wait_for_timeout(2500)
    cam = pg.locator('[data-testid=mirror-stage]').get_attribute('data-cam')
    ok('拒绝摄像头时提示重试', cam in ('denied', 'error') and pg.locator('[data-testid=use-illustration]').count() == 1, cam)
    pg.screenshot(path=f'{SH}/denied-390.png')
    pg.click('[data-testid=use-illustration]'); pg.wait_for_timeout(500)
    ok('退回插画假人', pg.locator('svg.figure, .figure').count() > 0)
    pg.screenshot(path=f'{SH}/illustration-fallback-390.png')
    b.close()

with sync_playwright() as p:
    run(p, '/workspace/vt-e2e/person-half.y4m', {'width': 390, 'height': 844}, True, 'male', ['换件美拉德夹克', '来条白色牛仔裤', '试试新中式'], 'mobile390-male')
    run(p, '/workspace/vt-e2e/person-front.y4m', {'width': 1440, 'height': 900}, False, 'female', ['换件老钱风的外套', '来条黑色阔腿裤', '试试新中式'], 'desktop-female')
    denied(p)
print('ALL', 'PASS' if all(res) else 'FAIL', sum(res), '/', len(res))
