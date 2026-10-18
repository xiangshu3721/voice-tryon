import type { ReactNode } from 'react'
import { tone } from '../palette'
import type { DrawSpec, Hem, Material } from './specs'
import {
  along,
  band,
  bodicePath,
  capsule,
  dOf,
  downSide,
  edge,
  mirror,
  offsetChain,
  type Anchors,
  type Pt,
} from './geom'

function glossOf(material?: Material): number {
  if (material === 'leather') return 1
  if (material === 'silk') return 0.85
  if (material === 'denim') return 0.4
  if (material === 'knit' || material === 'wool') return 0.38
  return 0.65
}

function lightCloth(color: string): boolean {
  const hex = color.replace('#', '')
  if (hex.length < 6) return false
  const n = Number.parseInt(hex.slice(0, 6), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 214
}

export function Volume({ uid, d, color, gloss = 0.65 }: { uid: string; d: string; color: string; gloss?: number }) {
  if (!d) return null
  const light = lightCloth(color)
  return (
    <g>
      <path d={d} fill={color} />
      <path d={d} fill={`url(#${uid}-shade)`} />
      <path d={d} fill={`url(#${uid}-light)`} opacity={light ? gloss * 0.4 : gloss} />
      <path
        d={d}
        fill="none"
        stroke={light ? '#8A7B70' : tone(color, -0.45)}
        strokeWidth={light ? 1.35 : 0.85}
        opacity={light ? 0.7 : 0.32}
      />
    </g>
  )
}

function hemY(a: Anchors, hem: Hem): number {
  if (hem === 'crop') return a.y.waist - 16
  if (hem === 'waist') return a.y.waist + 6
  if (hem === 'hip') return a.y.hip + 12
  if (hem === 'thigh') return a.y.hip + 78
  return a.y.knee + 16
}

function sleevePath(a: Anchors, reach: number, extra: number, dir: -1 | 1): string {
  const { shoulder, elbow, wrist, rs, re, rw } = a.arm
  const sh = dir < 0 ? shoulder : mirror(shoulder, a.cx)
  const el = dir < 0 ? elbow : mirror(elbow, a.cx)
  const wr = dir < 0 ? wrist : mirror(wrist, a.cx)
  if (reach <= 0.45) {
    const t = Math.min(1, reach / 0.45)
    return band([sh, along(sh, el, t)], [rs + extra, rs + (re - rs) * t + extra])
  }
  const t = Math.min(1, (reach - 0.45) / 0.55)
  return band([sh, el, along(el, wr, t)], [rs + extra, re + extra, re + (rw - re) * t + extra])
}

function sleeves(a: Anchors, reach: number, extra: number, uid: string, color: string, gloss: number) {
  return (
    <g>
      <Volume uid={uid} color={color} gloss={gloss} d={sleevePath(a, reach, extra, -1)} />
      <Volume uid={uid} color={color} gloss={gloss} d={sleevePath(a, reach, extra, 1)} />
    </g>
  )
}

function trousersPath(a: Anchors, widen: number, to: 'ankle' | 'thigh'): string {
  const { hip, knee, ankle, rh, rk, ra } = a.leg
  const hem: Pt = [ankle[0] + (ankle[0] - knee[0]) * 0.05, a.y.ground - 16]
  const chain = to === 'ankle' ? [hip, knee, hem] : [hip, along(hip, knee, 0.42)]
  const radii =
    to === 'ankle'
      ? [rh + widen, rk + widen, ra + widen + 2]
      : [rh + widen, rh * 0.55 + rk * 0.45 + widen]
  const outer = offsetChain(chain, radii, 1)
  const inner = offsetChain(chain, radii, -1)
  const flip = (p: Pt): Pt => mirror(p, a.cx)
  const seatY = a.y.crotch + 8
  const inseam = inner.filter((p) => p[1] > seatY + 6)
  const waistL = edge(a, a.y.waist - 16, -1, 6)
  const waistR = edge(a, a.y.waist - 16, 1, 6)
  const seatL: Pt = [a.cx - 16, seatY]
  const seatR: Pt = [a.cx + 16, seatY]
  return dOf(
    [waistL, ...outer, ...[...inseam].reverse(), seatL, seatR, ...inseam.map(flip), ...[...outer.map(flip)].reverse(), waistR],
    true,
  )
}

function skirt(a: Anchors, hem: number, flare: number, wave = false): string {
  const top = a.y.waist - 14
  const left = downSide(a, top, hem, -1, 2, flare)
  const right = downSide(a, hem, top, 1, 2, flare)
  if (!wave) return dOf([...left, ...right], true)
  const x0 = left[left.length - 1][0]
  const x1 = right[0][0]
  const wavy: Pt[] = []
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    wavy.push([x0 + (x1 - x0) * t, hem + Math.sin(t * Math.PI * 6) * 7])
  }
  return dOf([...left.slice(0, -1), ...wavy, ...right.slice(1)], true)
}

function panels(a: Anchors, hem: number, gap: number, extra: number): [string, string] {
  const top = a.y.shoulder + 28
  const make = (dir: -1 | 1) => {
    const inner = a.cx + dir * gap
    return dOf(
      [
        [inner, top],
        [inner, hem],
        edge(a, hem, dir, extra),
        ...downSide(a, hem, top, dir, extra).slice(1),
      ],
      true,
    )
  }
  return [make(-1), make(1)]
}

function lapel(a: Anchors, dir: -1 | 1, gap: number): string {
  const y = a.y.shoulder + 14
  const inner = a.cx + dir * gap
  const into = -dir
  return dOf(
    [
      [inner + dir * 6, y],
      [inner + into * 16, y + 52],
      [inner + into * 2, y + 96],
      [inner + dir * 8, y + 28],
    ],
    true,
  )
}

function Buttons({ a, color, from, to }: { a: Anchors; color: string; from: number; to: number }) {
  const dots = []
  for (let y = from; y < to; y += 22) dots.push(<circle key={y} cx={a.cx} cy={y} r={2.2} fill={tone(color, -0.35)} />)
  return <g>{dots}</g>
}

function Collar({ a, color, uid }: { a: Anchors; color: string; uid: string }) {
  const y = a.y.shoulder
  const left = dOf(
    [
      [a.cx - 4, y + 4],
      [a.cx - 26, y + 10],
      [a.cx - 14, y + 32],
      [a.cx - 2, y + 16],
    ],
    true,
  )
  const right = dOf(
    [
      [a.cx + 4, y + 4],
      [a.cx + 26, y + 10],
      [a.cx + 14, y + 32],
      [a.cx + 2, y + 16],
    ],
    true,
  )
  return (
    <g>
      <Volume uid={uid} color={tone(color, 0.06)} d={left} />
      <Volume uid={uid} color={tone(color, 0.06)} d={right} />
    </g>
  )
}

export function GarmentShape({ a, spec, color, uid }: { a: Anchors; spec: DrawSpec; color: string; uid: string }): ReactNode {
  const gloss = glossOf('material' in spec ? spec.material : undefined)

  if (spec.kind === 'top') {
    const hem = hemY(a, spec.hem)
    const drop = spec.neck === 'v' ? 48 : spec.neck === 'scoop' ? 40 : spec.neck === 'shirt' ? 28 : spec.neck === 'turtleneck' ? -26 : spec.neck === 'mandarin' ? -8 : 24
    const strap = spec.sleeve === 'none'
    const reach = spec.sleeve === 'long' ? 0.92 : spec.sleeve === 'none' ? 0 : 0.42
    return (
      <g>
        {spec.hood && (
          <Volume
            uid={uid}
            color={color}
            gloss={gloss}
            d={`M ${a.cx - 62} 210 C ${a.cx - 78} 150 ${a.cx - 70} 48 ${a.cx} 30 C ${a.cx + 70} 48 ${a.cx + 78} 150 ${a.cx + 62} 210 L ${a.cx + 40} 196 C ${a.cx + 28} 120 ${a.cx + 18} 78 ${a.cx} 74 C ${a.cx - 18} 78 ${a.cx - 28} 120 ${a.cx - 40} 196 Z`}
          />
        )}
        {reach > 0 && sleeves(a, reach, spec.fit + 2, uid, color, gloss)}
        <Volume uid={uid} color={color} gloss={gloss} d={bodicePath(a, hem, spec.fit, 0, drop, strap ? 10 : 0)} />
        {spec.buttons && <Buttons a={a} color={color} from={a.y.shoulder + 36} to={hem - 6} />}
        {spec.neck === 'shirt' && <Collar a={a} color={color} uid={uid} />}
        {(spec.neck === 'mandarin' || spec.neck === 'turtleneck') && (
          <Volume
            uid={uid}
            color={tone(color, -0.06)}
            d={dOf(
              [
                [a.cx - 16, a.neck.bot - 8],
                [a.cx - 14, spec.neck === 'turtleneck' ? a.neck.top + 4 : a.neck.bot - 24],
                [a.cx + 14, spec.neck === 'turtleneck' ? a.neck.top + 4 : a.neck.bot - 24],
                [a.cx + 16, a.neck.bot - 8],
              ],
              true,
            )}
          />
        )}
        {spec.pocket && (
          <path
            d={`M ${a.cx - 26} ${a.y.waist - 6} h 52 v 26 h -52 Z`}
            fill="none"
            stroke={tone(color, -0.35)}
            strokeWidth={1.2}
          />
        )}
      </g>
    )
  }

  if (spec.kind === 'outer' || spec.kind === 'coat') {
    const hem = spec.kind === 'coat' ? a.y.knee + (spec.style === 'trench' ? 30 : 18) : hemY(a, spec.hem)
    const extra = spec.kind === 'coat' ? 16 : spec.fit
    const gap = spec.kind === 'coat' ? 20 : spec.style === 'cardigan' ? 30 : spec.style === 'blazer' ? 18 : spec.style === 'zip' ? 16 : 14
    const [left, right] = panels(a, hem, gap, extra)
    const showLapel = spec.kind === 'coat' || (spec.kind === 'outer' && (spec.style === 'blazer' || spec.style === 'denim'))
    return (
      <g>
        {sleeves(a, 0.94, extra + 1, uid, color, gloss)}
        <Volume uid={uid} color={color} gloss={gloss} d={bodicePath(a, a.y.shoulder + 34, extra, 0, 36)} />
        <Volume uid={uid} color={color} gloss={gloss} d={left} />
        <Volume uid={uid} color={color} gloss={gloss} d={right} />
        {showLapel && (
          <>
            <Volume uid={uid} color={tone(color, -0.16)} d={lapel(a, -1, gap)} />
            <Volume uid={uid} color={tone(color, -0.16)} d={lapel(a, 1, gap)} />
          </>
        )}
        {spec.kind === 'outer' && (spec.style === 'zip' || spec.style === 'bomber') && (
          <path d={`M ${a.cx - gap} ${a.y.shoulder + 40} V ${hem - 8}`} stroke={tone(color, 0.45)} strokeWidth={1.6} />
        )}
        {spec.kind === 'coat' && spec.style === 'trench' && (
          <path
            d={`M ${edge(a, a.y.waist, -1, extra)[0]} ${a.y.waist} H ${edge(a, a.y.waist, 1, extra)[0]}`}
            stroke={tone(color, -0.25)}
            strokeWidth={7}
            strokeLinecap="round"
          />
        )}
      </g>
    )
  }

  if (spec.kind === 'bottom') {
    if (spec.style === 'skirt' || spec.style === 'pleat') {
      const hem = spec.style === 'pleat' ? a.y.knee - 8 : a.y.knee + 24
      const flare = spec.style === 'pleat' ? 0.22 : 0.14
      return (
        <g>
          <Volume uid={uid} color={color} gloss={gloss} d={skirt(a, hem, flare)} />
          {spec.style === 'pleat' &&
            Array.from({ length: 8 }, (_, i) => {
              const x0 = a.cx - 40 + i * 11
              return <path key={x0} d={`M ${x0} ${a.y.waist} L ${x0 + (i - 4)} ${hem}`} stroke={tone(color, -0.3)} strokeWidth={0.8} opacity={0.5} />
            })}
        </g>
      )
    }
    const to = spec.style === 'shorts' ? 'thigh' : 'ankle'
    const widen = spec.style === 'wide' ? 12 : spec.style === 'taper' ? 1 : 4
    return (
      <g>
        <Volume uid={uid} color={color} gloss={gloss} d={trousersPath(a, widen, to)} />
        {spec.detail === 'jeans' && (
          <g fill="none" stroke={tone(color, -0.35)} strokeWidth={1} opacity={0.7}>
            <path d={`M ${a.cx - 40} ${a.y.waist + 16} q 16 14 30 1`} />
            <path d={`M ${a.cx + 10} ${a.y.waist + 16} q 16 14 30 1`} />
          </g>
        )}
        {spec.detail === 'cargo' && (
          <g fill={tone(color, -0.1)} stroke={tone(color, -0.28)}>
            <rect x={a.leg.hip[0] - 36} y={a.y.hip + 24} width={22} height={18} rx={2} />
            <rect x={mirror(a.leg.hip, a.cx)[0] + 14} y={a.y.hip + 24} width={22} height={18} rx={2} />
          </g>
        )}
      </g>
    )
  }

  if (spec.kind === 'dress') {
    if (spec.style === 'column') {
      return <Volume uid={uid} color={color} gloss={gloss} d={bodicePath(a, a.y.ankle - 8, 1, 0.02, 34)} />
    }
    if (spec.style === 'slip') {
      const top = a.y.bust - 10
      return (
        <g>
          <Volume uid={uid} color={color} gloss={gloss} d={capsule([a.cx - 36, a.y.shoulder + 4], [a.cx - 16, top], 4, 4)} />
          <Volume uid={uid} color={color} gloss={gloss} d={capsule([a.cx + 36, a.y.shoulder + 4], [a.cx + 16, top], 4, 4)} />
          <Volume uid={uid} color={color} gloss={gloss} d={skirt(a, a.y.knee + 46, 0.16)} />
          <Volume uid={uid} color={color} gloss={gloss} d={bodicePath(a, a.y.waist + 10, -2, 0, 36, 8)} />
        </g>
      )
    }
    const wavy = spec.style === 'ruffle'
    const hem = wavy ? a.y.knee + 52 : a.y.knee + 18
    return (
      <g>
        {spec.style === 'shirt' && sleeves(a, 0.4, 2, uid, color, gloss)}
        <Volume uid={uid} color={color} gloss={gloss} d={bodicePath(a, a.y.waist + 8, 0, 0, spec.style === 'shirt' ? 28 : 36, wavy ? 6 : 0)} />
        <Volume uid={uid} color={color} gloss={gloss} d={skirt(a, hem, wavy ? 0.28 : 0.16, wavy)} />
        {spec.style === 'shirt' && <Buttons a={a} color={color} from={a.y.shoulder + 34} to={a.y.knee} />}
        {spec.style === 'shirt' && <Collar a={a} color={color} uid={uid} />}
      </g>
    )
  }

  if (spec.kind === 'shoes') {
    return (
      <g>
        <Shoe a={a} spec={spec} color={color} uid={uid} dir={-1} />
        <Shoe a={a} spec={spec} color={color} uid={uid} dir={1} />
      </g>
    )
  }

  if (spec.kind === 'belt') {
    const y = a.y.waist
    const x0 = edge(a, y, -1, 6)[0]
    const x1 = edge(a, y, 1, 6)[0]
    return (
      <g>
        <path d={`M ${x0} ${y - 6} H ${x1} V ${y + 6} H ${x0} Z`} fill={color} />
        <rect x={a.cx - 7} y={y - 8} width={14} height={16} rx={1.5} fill={tone(color, 0.45)} />
      </g>
    )
  }

  if (spec.kind === 'hat') return <Hat a={a} spec={spec} color={color} uid={uid} />
  if (spec.kind === 'neck') return <NeckWear a={a} spec={spec} color={color} uid={uid} />
  if (spec.kind === 'bag') return <Bag a={a} spec={spec} color={color} uid={uid} />
  if (spec.kind === 'glasses') {
    const y = a.head.cy + 8
    const dx = a.gender === 'female' ? 16 : 18
    return (
      <g fill="none" stroke={color} strokeWidth={1.8}>
        <rect x={a.cx - dx - 16} y={y} width={18} height={11} rx={2} />
        <rect x={a.cx + dx - 2} y={y} width={18} height={11} rx={2} />
        <path d={`M ${a.cx - dx + 2} ${y + 5} H ${a.cx + dx - 2}`} />
      </g>
    )
  }
  return null
}

function Shoe({
  a,
  spec,
  color,
  uid,
  dir,
}: {
  a: Anchors
  spec: DrawSpec & { kind: 'shoes' }
  color: string
  uid: string
  dir: -1 | 1
}) {
  const ankle = dir < 0 ? a.leg.ankle : mirror(a.leg.ankle, a.cx)
  const ground = a.y.ground
  const x = ankle[0]
  const toe = x + dir * (spec.style === 'heel' ? 30 : 36)
  const heel = x - dir * 12
  if (spec.style === 'sandal') {
    return (
      <g>
        <ellipse cx={x + dir * 8} cy={ground - 10} rx={18} ry={7} fill={`url(#${uid}-skin)`} />
        <path d={`M ${heel} ${ground - 14} H ${toe}`} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <path d={`M ${x} ${ground - 24} L ${x + dir * 10} ${ground - 12}`} stroke={color} strokeWidth={2.4} />
        <path d={`M ${heel} ${ground - 4} H ${toe + dir * 4} V ${ground} H ${heel} Z`} fill={tone(color, -0.2)} />
      </g>
    )
  }
  const tall = spec.style === 'boot' ? 70 : spec.style === 'sneaker' ? 30 : spec.style === 'heel' ? 26 : 24
  const upper = dOf(
    [
      [heel, ground - 4],
      [heel - dir * 1, ground - tall],
      [x + dir * 8, ground - tall - 2],
      [toe, ground - 14],
      [toe + dir * 3, ground - 3],
    ],
    true,
  )
  return (
    <g>
      {spec.style === 'heel' && <path d={dOf([[heel, ground - 10], [heel + dir * 6, ground - 10], [heel + dir * 5, ground], [heel - dir * 1, ground]], true)} fill={tone(color, -0.15)} />}
      <Volume uid={uid} color={color} gloss={spec.style === 'sneaker' ? 0.8 : 0.45} d={upper} />
      <path d={`M ${heel - dir * 2} ${ground - 6} H ${toe + dir * 4} V ${ground + 1} H ${heel - dir * 2} Z`} fill={spec.style === 'sneaker' ? '#C8C2B8' : tone(color, -0.28)} />
      {spec.style === 'sneaker' && (
        <path d={`M ${heel + dir * 2} ${ground - tall + 8} H ${x + dir * 14}`} stroke="#F7F4EF" strokeWidth={2.2} strokeLinecap="round" />
      )}
    </g>
  )
}

function Hat({ a, spec, color, uid }: { a: Anchors; spec: DrawSpec & { kind: 'hat' }; color: string; uid: string }) {
  const { cx, cy, rx } = a.head
  if (spec.style === 'beret') {
    return <Volume uid={uid} color={color} d={`M ${cx - rx} ${cy - 18} C ${cx - rx - 6} ${cy - 48} ${cx + 10} ${cy - 54} ${cx + rx - 4} ${cy - 36} C ${cx + rx + 8} ${cy - 16} ${cx + 8} ${cy - 8} ${cx - rx} ${cy - 18} Z`} />
  }
  if (spec.style === 'straw') {
    return (
      <g>
        <ellipse cx={cx} cy={cy - 28} rx={rx + 46} ry={14} fill={color} />
        <Volume uid={uid} color={tone(color, -0.05)} d={`M ${cx - 22} ${cy - 26} C ${cx - 22} ${cy - 52} ${cx + 22} ${cy - 52} ${cx + 22} ${cy - 26} Z`} />
      </g>
    )
  }
  if (spec.style === 'cap') {
    return (
      <g>
        <Volume uid={uid} color={color} d={`M ${cx - rx + 2} ${cy - 8} C ${cx - rx} ${cy - 40} ${cx + 8} ${cy - 50} ${cx + rx - 6} ${cy - 16} C ${cx + 10} ${cy - 20} ${cx - 10} ${cy - 16} ${cx - rx + 2} ${cy - 8} Z`} />
        <ellipse cx={cx + 18} cy={cy - 4} rx={26} ry={8} fill={tone(color, -0.08)} />
      </g>
    )
  }
  return <Volume uid={uid} color={color} d={`M ${cx - rx - 2} ${cy - 4} C ${cx - rx} ${cy - 46} ${cx + rx} ${cy - 48} ${cx + rx + 2} ${cy - 4} C ${cx + 16} ${cy - 14} ${cx - 16} ${cy - 14} ${cx - rx - 2} ${cy - 4} Z`} />
}

function NeckWear({ a, spec, color, uid }: { a: Anchors; spec: DrawSpec & { kind: 'neck' }; color: string; uid: string }) {
  if (spec.style === 'tie') {
    const y = a.y.shoulder - 4
    return (
      <g>
        <Volume uid={uid} color={color} d={`M ${a.cx - 7} ${y} L ${a.cx + 7} ${y} L ${a.cx + 4} ${y + 12} L ${a.cx - 4} ${y + 12} Z`} />
        <Volume uid={uid} color={color} d={`M ${a.cx - 5} ${y + 10} L ${a.cx + 5} ${y + 10} L ${a.cx + 8} ${a.y.waist - 20} L ${a.cx} ${a.y.waist - 4} L ${a.cx - 8} ${a.y.waist - 20} Z`} />
      </g>
    )
  }
  return (
    <g>
      <Volume
        uid={uid}
        color={color}
        d={`M ${a.cx - 26} ${a.y.shoulder - 6} C ${a.cx - 8} ${a.y.shoulder + 18} ${a.cx + 8} ${a.y.shoulder + 18} ${a.cx + 28} ${a.y.shoulder - 4} L ${a.cx + 18} ${a.y.shoulder + 10} C ${a.cx + 4} ${a.y.shoulder + 26} ${a.cx - 6} ${a.y.shoulder + 26} ${a.cx - 18} ${a.y.shoulder + 8} Z`}
      />
      <Volume uid={uid} color={color} d={`M ${a.cx - 6} ${a.y.shoulder + 12} L ${a.cx + 8} ${a.y.shoulder + 18} L ${a.cx - 2} ${a.y.waist + 8} L ${a.cx - 16} ${a.y.waist} Z`} />
    </g>
  )
}

function Bag({ a, spec, color, uid }: { a: Anchors; spec: DrawSpec & { kind: 'bag' }; color: string; uid: string }) {
  if (spec.style === 'brief') {
    const hand = mirror(a.arm.wrist, a.cx)
    return <Volume uid={uid} color={color} d={`M ${hand[0] - 10} ${hand[1] + 8} h 42 v 32 h -42 Z`} />
  }
  const x = a.cx + (a.cx - a.side[0].x) + 18
  return (
    <g>
      <path d={`M ${a.cx * 2 - a.side[0].x - 4} ${a.y.shoulder + 6} L ${x + 10} 368`} stroke={tone(color, -0.2)} strokeWidth={3} fill="none" />
      <Volume uid={uid} color={color} d={`M ${x} 360 h 40 l 3 72 h -46 Z`} />
    </g>
  )
}
