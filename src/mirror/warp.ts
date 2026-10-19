/**
 * 锚点变形数学：把平铺单品图上的四个锚点（左右肩 + 左右胯，或腰两侧 + 下摆两侧）
 * 用双线性映射贴到身体上的四个点。图上任意一点先反解出 (u, v)，再落到身体四边形里。
 * 四边形之外的部分（袖子、领子、下摆）按同一映射线性外推。
 */

export interface Pt {
  x: number
  y: number
}

/** 顺序固定：左上、右上、右下、左下（左 = 画面左侧）。 */
export type Quad = [Pt, Pt, Pt, Pt]

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 双线性：u 沿左右，v 沿上下。 */
export function bilinear(q: Quad, u: number, v: number): Pt {
  const top = lerp(q[0], q[1], u)
  const bottom = lerp(q[3], q[2], u)
  return lerp(top, bottom, v)
}

/** 反解双线性（牛顿迭代）。对凸、接近矩形的四边形几步就收敛。 */
export function inverseBilinear(q: Quad, p: Pt, iterations = 8): { u: number; v: number } {
  let u = 0.5
  let v = 0.5
  for (let i = 0; i < iterations; i++) {
    const f = bilinear(q, u, v)
    const ex = f.x - p.x
    const ey = f.y - p.y
    // 偏导
    const dux = (1 - v) * (q[1].x - q[0].x) + v * (q[2].x - q[3].x)
    const duy = (1 - v) * (q[1].y - q[0].y) + v * (q[2].y - q[3].y)
    const dvx = (1 - u) * (q[3].x - q[0].x) + u * (q[2].x - q[1].x)
    const dvy = (1 - u) * (q[3].y - q[0].y) + u * (q[2].y - q[1].y)
    const det = dux * dvy - dvx * duy
    if (Math.abs(det) < 1e-12) break
    const du = (ex * dvy - ey * dvx) / det
    const dv = (dux * ey - duy * ex) / det
    u -= du
    v -= dv
    if (Math.abs(du) < 1e-9 && Math.abs(dv) < 1e-9) break
  }
  return { u, v }
}

/** 图上一点 → 身体上一点。 */
export function mapPoint(src: Quad, dst: Quad, p: Pt): Pt {
  const { u, v } = inverseBilinear(src, p)
  return bilinear(dst, u, v)
}

export interface Affine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/** 三点求仿射：s_i → d_i。返回 canvas setTransform 用的 (a,b,c,d,e,f)。 */
export function affineFromTriangles(s: [Pt, Pt, Pt], d: [Pt, Pt, Pt]): Affine | null {
  const [s0, s1, s2] = s
  const [d0, d1, d2] = d
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y)
  if (Math.abs(den) < 1e-9) return null
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den
  const dd = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - dd * s0.y
  return { a, b, c, d: dd, e, f }
}

export function applyAffine(m: Affine, p: Pt): Pt {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }
}

export interface Mesh {
  cols: number
  rows: number
  /** 图上网格点（像素） */
  src: Pt[]
  /** 屏幕网格点（像素） */
  dst: Pt[]
}

/** 把整张图切成 cols×rows 的网格，每个网格点按锚点映射到身体。 */
export function buildMesh(width: number, height: number, srcQuad: Quad, dstQuad: Quad, cols = 6, rows = 8): Mesh {
  const src: Pt[] = []
  const dst: Pt[] = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = { x: (c / cols) * width, y: (r / rows) * height }
      src.push(p)
      dst.push(mapPoint(srcQuad, dstQuad, p))
    }
  }
  return { cols, rows, src, dst }
}

/** 画布：把三角形 s 内的图片贴到三角形 d（稍外扩，避免缝）。 */
export function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s: [Pt, Pt, Pt],
  d: [Pt, Pt, Pt],
) {
  const m = affineFromTriangles(s, d)
  if (!m) return
  const cx = (d[0].x + d[1].x + d[2].x) / 3
  const cy = (d[0].y + d[1].y + d[2].y) / 3
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const dx = d[i].x - cx
    const dy = d[i].y - cy
    const len = Math.hypot(dx, dy) || 1
    const grow = 0.9 / len
    const px = d[i].x + dx * grow
    const py = d[i].y + dy * grow
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.clip()
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

export function drawMesh(ctx: CanvasRenderingContext2D, img: CanvasImageSource, mesh: Mesh) {
  const { cols, src, dst } = mesh
  const at = (r: number, c: number) => r * (cols + 1) + c
  for (let r = 0; r < mesh.rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i0 = at(r, c)
      const i1 = at(r, c + 1)
      const i2 = at(r + 1, c + 1)
      const i3 = at(r + 1, c)
      drawTriangle(ctx, img, [src[i0], src[i1], src[i2]], [dst[i0], dst[i1], dst[i2]])
      drawTriangle(ctx, img, [src[i0], src[i2], src[i3]], [dst[i0], dst[i2], dst[i3]])
    }
  }
}
