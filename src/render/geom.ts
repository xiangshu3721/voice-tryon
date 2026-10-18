import type { Gender } from '../types'

export type Pt = [number, number]

export interface SidePt {
  y: number
  x: number
}

export interface Anchors {
  gender: Gender
  cx: number
  head: { cx: number; cy: number; rx: number; ry: number }
  neck: { top: number; bot: number; half: number }
  y: { shoulder: number; bust: number; waist: number; hip: number; crotch: number; knee: number; ankle: number; ground: number }
  side: SidePt[]
  arm: { shoulder: Pt; elbow: Pt; wrist: Pt; rs: number; re: number; rw: number }
  leg: { hip: Pt; knee: Pt; ankle: Pt; rh: number; rk: number; ra: number }
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function dOf(pts: Pt[], close = false): string {
  if (!pts.length) return ''
  let d = `M ${r1(pts[0][0])} ${r1(pts[0][1])}`
  for (let i = 1; i < pts.length; i++) d += ` L ${r1(pts[i][0])} ${r1(pts[i][1])}`
  if (close) d += ' Z'
  return d
}

function unit(a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return [dx / len, dy / len]
}

/** side 1 is the left normal of the direction of travel. */
export function offsetChain(pts: Pt[], radii: number[], side: 1 | -1): Pt[] {
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(pts.length - 1, i + 1)]
    const [dx, dy] = unit(prev, next)
    return [p[0] - dy * side * radii[i], p[1] + dx * side * radii[i]] as Pt
  })
}

function arc(center: Pt, dir: Pt, normal: Pt, radius: number, fromSign: 1 | -1): Pt[] {
  const out: Pt[] = []
  const steps = 5
  for (let i = 1; i < steps; i++) {
    const t = (i / steps) * Math.PI
    const c = Math.cos(t) * fromSign
    const s = Math.sin(t)
    out.push([
      center[0] + normal[0] * c * radius + dir[0] * s * radius,
      center[1] + normal[1] * c * radius + dir[1] * s * radius,
    ])
  }
  return out
}

/** Tapered limb with round ends, following the bone points. */
export function band(pts: Pt[], radii: number[]): string {
  const left = offsetChain(pts, radii, 1)
  const right = offsetChain(pts, radii, -1)
  const last = pts.length - 1
  const d0 = unit(pts[0], pts[1])
  const d1 = unit(pts[last - 1], pts[last])
  const n0: Pt = [-d0[1], d0[0]]
  const n1: Pt = [-d1[1], d1[0]]
  const endCap = arc(pts[last], d1, n1, radii[last], 1)
  const startCap = arc(pts[0], [-d0[0], -d0[1]], n0, radii[0], -1)
  return dOf([...left, ...endCap, ...[...right].reverse(), ...startCap], true)
}

export function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  return band([a, b], [ra, rb])
}

export function mirror(p: Pt, cx: number): Pt {
  return [cx * 2 - p[0], p[1]]
}

export function buildAnchors(gender: Gender): Anchors {
  const cx = 200
  if (gender === 'female') {
    return {
      gender,
      cx,
      head: { cx, cy: 102, rx: 33, ry: 40 },
      neck: { top: 136, bot: 186, half: 11 },
      y: { shoulder: 200, bust: 256, waist: 326, hip: 402, crotch: 458, knee: 582, ankle: 728, ground: 748 },
      side: [
        { y: 200, x: 144 },
        { y: 228, x: 148 },
        { y: 256, x: 150 },
        { y: 292, x: 160 },
        { y: 326, x: 166 },
        { y: 364, x: 154 },
        { y: 402, x: 138 },
        { y: 434, x: 156 },
        { y: 458, x: 184 },
      ],
      arm: { shoulder: [152, 210], elbow: [98, 338], wrist: [86, 468], rs: 15, re: 12, rw: 9 },
      leg: { hip: [164, 412], knee: [156, 584], ankle: [166, 728], rh: 26, rk: 15, ra: 10 },
    }
  }
  return {
    gender,
    cx,
    head: { cx, cy: 104, rx: 36, ry: 41 },
    neck: { top: 138, bot: 192, half: 14 },
    y: { shoulder: 204, bust: 260, waist: 336, hip: 410, crotch: 466, knee: 586, ankle: 728, ground: 748 },
    side: [
      { y: 204, x: 126 },
      { y: 232, x: 134 },
      { y: 260, x: 140 },
      { y: 298, x: 150 },
      { y: 336, x: 158 },
      { y: 372, x: 152 },
      { y: 410, x: 146 },
      { y: 440, x: 158 },
      { y: 466, x: 184 },
    ],
    arm: { shoulder: [136, 214], elbow: [84, 344], wrist: [74, 476], rs: 18, re: 15, rw: 11 },
    leg: { hip: [162, 420], knee: [154, 588], ankle: [164, 728], rh: 30, rk: 18, ra: 12 },
  }
}

export function halfAt(a: Anchors, y: number, flare = 0): number {
  const s = a.side
  if (y <= s[0].y) return a.cx - s[0].x
  if (y >= s[s.length - 1].y) {
    const hip = s.find((p) => p.y >= a.y.hip) ?? s[s.length - 1]
    return a.cx - hip.x + (y - a.y.hip) * flare
  }
  for (let i = 0; i < s.length - 1; i++) {
    if (y <= s[i + 1].y) {
      const t = (y - s[i].y) / (s[i + 1].y - s[i].y)
      const x = s[i].x + (s[i + 1].x - s[i].x) * t
      return a.cx - x
    }
  }
  return a.cx - s[s.length - 1].x
}

export function edge(a: Anchors, y: number, dir: -1 | 1, extra = 0, flare = 0): Pt {
  return [a.cx + dir * (halfAt(a, y, flare) + extra), y]
}

export function downSide(a: Anchors, y0: number, y1: number, dir: -1 | 1, extra = 0, flare = 0): Pt[] {
  const pts: Pt[] = []
  const step = y1 >= y0 ? 10 : -10
  if (step > 0) {
    for (let y = y0; y < y1; y += step) pts.push(edge(a, y, dir, extra, flare))
  } else {
    for (let y = y0; y > y1; y += step) pts.push(edge(a, y, dir, extra, flare))
  }
  pts.push(edge(a, y1, dir, extra, flare))
  return pts
}

function smoothClosed(pts: Pt[]): string {
  if (pts.length < 3) return dOf(pts, true)
  const n = pts.length
  const at = (i: number) => pts[(i + n) % n]
  const mid = (i: number): Pt => [(at(i)[0] + at(i + 1)[0]) / 2, (at(i)[1] + at(i + 1)[1]) / 2]
  const start = mid(0)
  let d = `M ${r1(start[0])} ${r1(start[1])}`
  for (let i = 1; i <= n; i++) {
    const p = at(i)
    const m = mid(i)
    d += ` Q ${r1(p[0])} ${r1(p[1])} ${r1(m[0])} ${r1(m[1])}`
  }
  return `${d} Z`
}

export function torsoPath(a: Anchors): string {
  const left = a.side.map((p) => [p.x, p.y] as Pt)
  const right = [...a.side].reverse().map((p) => [a.cx * 2 - p.x, p.y] as Pt)
  return smoothClosed([
    [a.cx - a.neck.half, a.neck.bot - 2],
    [a.cx - a.neck.half - 8, a.neck.bot + 8],
    ...left,
    ...right,
    [a.cx + a.neck.half + 8, a.neck.bot + 8],
    [a.cx + a.neck.half, a.neck.bot - 2],
  ])
}

export function bodicePath(a: Anchors, hemY: number, extra: number, flare: number, neckDrop: number, shoulderInset = 0): string {
  const top = a.y.shoulder
  const left = downSide(a, top, hemY, -1, extra - shoulderInset, flare)
  const right = downSide(a, hemY, top, 1, extra - shoulderInset, flare)
  const neckL: Pt = [a.cx - 18 - shoulderInset, top - 2]
  const neckR: Pt = [a.cx + 18 + shoulderInset, top - 2]
  return dOf([neckL, ...left, ...right, neckR, [a.cx, top + neckDrop]], true)
}

export function along(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}
