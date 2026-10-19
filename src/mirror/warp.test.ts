import { describe, expect, it } from 'vitest'
import { OneEuro } from './filter'
import { completeBody, lowerQuads, upperQuads, type Anchors } from './fit'
import { affineFromTriangles, applyAffine, bilinear, buildMesh, inverseBilinear, mapPoint, type Quad } from './warp'

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps)

describe('双线性与反解', () => {
  const q: Quad = [
    { x: 10, y: 20 },
    { x: 110, y: 30 },
    { x: 120, y: 160 },
    { x: 5, y: 150 },
  ]
  it('四个角对应 (0,0)(1,0)(1,1)(0,1)', () => {
    expect(bilinear(q, 0, 0)).toEqual(q[0])
    expect(bilinear(q, 1, 0)).toEqual(q[1])
    expect(bilinear(q, 1, 1)).toEqual(q[2])
    expect(bilinear(q, 0, 1)).toEqual(q[3])
  })
  it('反解后再映射回原点（含四边形外的外推点）', () => {
    for (const [u, v] of [
      [0.3, 0.7],
      [0.5, 0.5],
      [-0.4, -0.2],
      [1.3, 1.6],
    ]) {
      const p = bilinear(q, u, v)
      const r = inverseBilinear(q, p)
      close(r.u, u, 1e-6)
      close(r.v, v, 1e-6)
    }
  })
  it('同一个四边形映射到自身是恒等', () => {
    const p = { x: 47, y: 88 }
    const m = mapPoint(q, q, p)
    close(m.x, p.x, 1e-6)
    close(m.y, p.y, 1e-6)
  })
  it('平移 + 缩放的四边形 → 点也平移缩放', () => {
    const src: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ]
    const dst: Quad = src.map((p) => ({ x: p.x * 0.5 + 30, y: p.y * 0.5 + 40 })) as Quad
    const m = mapPoint(src, dst, { x: 160, y: -20 })
    close(m.x, 110, 1e-6)
    close(m.y, 30, 1e-6)
  })
})

describe('三角仿射', () => {
  it('三个顶点精确对应，内部点保持重心坐标', () => {
    const s = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ] as [never, never, never]
    const d = [
      { x: 5, y: 5 },
      { x: 5, y: 25 },
      { x: -15, y: 5 },
    ] as [never, never, never]
    const m = affineFromTriangles(s, d)!
    for (let i = 0; i < 3; i++) {
      const p = applyAffine(m, s[i])
      close(p.x, (d[i] as { x: number }).x)
      close(p.y, (d[i] as { y: number }).y)
    }
    const c = applyAffine(m, { x: 10 / 3, y: 10 / 3 })
    close(c.x, (5 + 5 - 15) / 3)
    close(c.y, (5 + 25 + 5) / 3)
  })
  it('退化三角形返回 null', () => {
    expect(affineFromTriangles([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }])).toBeNull()
  })
})

const topAnchors: Anchors = {
  shoulderL: { x: 0.2, y: 0.1 },
  shoulderR: { x: 0.8, y: 0.1 },
  hipL: { x: 0.25, y: 0.75 },
  hipR: { x: 0.75, y: 0.75 },
  hem: { x: 0.5, y: 0.95 },
}

describe('上衣贴合', () => {
  const body = {
    shL: { x: 400, y: 300 },
    shR: { x: 600, y: 300 },
    hipL: { x: 430, y: 560 },
    hipR: { x: 570, y: 560 },
  }
  it('肩点比肩关节略宽，胯线落在髋部高度', () => {
    const r = upperQuads(body, topAnchors, 500, 600)!
    expect(r.dst[0].x).toBeLessThan(400)
    expect(r.dst[1].x).toBeGreaterThan(600)
    close(r.dst[0].y, 300)
    close(r.dst[2].y, 560)
    close((r.dst[2].x + r.dst[3].x) / 2, 500)
    // 胯宽 / 肩宽 保持单品图里的比例（0.5 / 0.6）
    const shoulderW = r.dst[1].x - r.dst[0].x
    const hipW = r.dst[2].x - r.dst[3].x
    close(hipW / shoulderW, 0.5 / 0.6, 1e-6)
  })
  it('人歪头转身（肩线倾斜）时衣服跟着旋转', () => {
    const tilted = { ...body, shL: { x: 400, y: 280 }, shR: { x: 600, y: 320 } }
    const r = upperQuads(tilted, topAnchors, 500, 600)!
    expect(r.dst[1].y - r.dst[0].y).toBeGreaterThan(30)
  })
  it('人走近（肩宽变大）衣服等比放大', () => {
    const near = {
      shL: { x: 300, y: 300 },
      shR: { x: 700, y: 300 },
      hipL: { x: 360, y: 820 },
      hipR: { x: 640, y: 820 },
    }
    const a = upperQuads(body, topAnchors, 500, 600)!
    const b = upperQuads(near, topAnchors, 500, 600)!
    const wa = a.dst[1].x - a.dst[0].x
    const wb = b.dst[1].x - b.dst[0].x
    close(wb / wa, 2, 1e-6)
  })
  it('网格映射：图上的肩点落到身上的肩点', () => {
    const r = upperQuads(body, topAnchors, 500, 600)!
    const mesh = buildMesh(500, 600, r.src, r.dst, 4, 4)
    expect(mesh.dst.length).toBe(25)
    const p = mapPoint(r.src, r.dst, r.src[0])
    close(p.x, r.dst[0].x, 1e-6)
    close(p.y, r.dst[0].y, 1e-6)
  })
})

describe('只拍到上半身时补出胯部', () => {
  it('按肩宽推算，胯在肩下方', () => {
    const b = completeBody({ shL: { x: 400, y: 300 }, shR: { x: 600, y: 300 } })
    expect(b.hipsEstimated).toBe(true)
    expect(b.hipL.y).toBeGreaterThan(500)
    close((b.hipL.x + b.hipR.x) / 2, 500)
    expect(b.hipL.x).toBeLessThan(b.hipR.x)
  })
})

describe('下装贴合', () => {
  const pants: Anchors = {
    waistL: { x: 0.1, y: 0.02 },
    waistR: { x: 0.9, y: 0.02 },
    hipL: { x: 0.08, y: 0.16 },
    hipR: { x: 0.92, y: 0.16 },
    hemL: { x: 0.05, y: 0.98 },
    hemR: { x: 0.95, y: 0.98 },
    hem: { x: 0.5, y: 0.98 },
  }
  const body = {
    shL: { x: 400, y: 300 },
    shR: { x: 600, y: 300 },
    hipL: { x: 450, y: 560 },
    hipR: { x: 550, y: 560 },
    kneeL: { x: 455, y: 760 },
    kneeR: { x: 545, y: 760 },
    ankleL: { x: 455, y: 950 },
    ankleR: { x: 545, y: 950 },
  }
  it('长裤到脚踝，腰线略高于髋', () => {
    const r = lowerQuads(body, pants, 'ankle', 300, 600)!
    expect(r.dst[0].y).toBeLessThan(560)
    close(r.dst[2].y, 950)
  })
  it('半裙到膝盖附近', () => {
    const r = lowerQuads(body, pants, 'knee', 300, 600)!
    close(r.dst[2].y, 760)
  })
})

describe('One Euro 滤波', () => {
  it('静止时抖动被压小，阶跃后能跟上', () => {
    const f = new OneEuro(1.4, 0.6)
    let t = 0
    let out = 0
    let maxDev = 0
    for (let i = 0; i < 60; i++) {
      t += 33
      const noisy = 0.5 + (i % 2 ? 0.01 : -0.01)
      out = f.filter(noisy, t)
      if (i > 10) maxDev = Math.max(maxDev, Math.abs(out - 0.5))
    }
    expect(maxDev).toBeLessThan(0.01)
    for (let i = 0; i < 30; i++) {
      t += 33
      out = f.filter(0.8, t)
    }
    expect(Math.abs(out - 0.8)).toBeLessThan(0.01)
  })
})
