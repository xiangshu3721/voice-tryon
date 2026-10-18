import { forwardRef, useId, useMemo } from 'react'
import { colorHex } from '../palette'
import type { Gender, Outfit, Slot } from '../types'
import { describeOutfit } from '../wardrobe/view'
import { GarmentShape, Volume } from './clothes'
import { band, buildAnchors, mirror, torsoPath, type Anchors, type Pt } from './geom'
import { DRAWS, type DrawSpec } from './specs'

const round = (n: number) => Math.round(n * 10) / 10

function Skin({ uid, d }: { uid: string; d: string }) {
  if (!d) return null
  return (
    <g>
      <path d={d} fill={`url(#${uid}-skin)`} />
      <path d={d} fill={`url(#${uid}-shade)`} opacity={0.5} />
      <path d={d} fill={`url(#${uid}-light)`} opacity={0.38} />
    </g>
  )
}

function headPath(a: Anchors): string {
  const { cx, cy, rx, ry } = a.head
  const jaw = a.gender === 'male' ? 0.84 : 0.7
  const chin = a.gender === 'male' ? 0.88 : 0.96
  return `M ${cx} ${round(cy - ry)}
    C ${round(cx + rx * 0.9)} ${round(cy - ry)} ${round(cx + rx)} ${round(cy - ry * 0.15)} ${round(cx + rx * jaw)} ${round(cy + ry * 0.38)}
    C ${round(cx + rx * 0.46)} ${round(cy + ry * chin)} ${round(cx + rx * 0.14)} ${round(cy + ry)} ${cx} ${round(cy + ry * 0.97)}
    C ${round(cx - rx * 0.14)} ${round(cy + ry)} ${round(cx - rx * 0.46)} ${round(cy + ry * chin)} ${round(cx - rx * jaw)} ${round(cy + ry * 0.38)}
    C ${round(cx - rx)} ${round(cy - ry * 0.15)} ${round(cx - rx * 0.9)} ${round(cy - ry)} ${cx} ${round(cy - ry)} Z`
}

function neckPath(a: Anchors): string {
  const { cx } = a
  const { half, top, bot } = a.neck
  return `M ${cx - half} ${top} L ${cx - half - 4} ${bot + 6} L ${cx + half + 4} ${bot + 6} L ${cx + half} ${top} Z`
}

function hairBack(a: Anchors): string {
  if (a.gender === 'male') return ''
  const { cx, cy, rx, ry } = a.head
  const crown = cy - ry - 10
  const tip = a.y.bust + 24
  const w = rx + 16
  return `M ${cx} ${round(crown)}
    C ${round(cx - w - 6)} ${round(crown + 16)} ${round(cx - w - 4)} ${round(cy + 30)} ${round(cx - w)} ${round(cy + 78)}
    C ${round(cx - w + 4)} ${round(tip - 10)} ${round(cx - 24)} ${round(tip + 16)} ${round(cx - 8)} ${round(tip)}
    C ${cx + 6} ${round(tip + 18)} ${round(cx + 22)} ${round(tip - 8)} ${round(cx + w)} ${round(cy + 78)}
    C ${round(cx + w + 4)} ${round(cy + 30)} ${round(cx + w + 6)} ${round(crown + 16)} ${cx} ${round(crown)} Z`
}

function Face({ a }: { a: Anchors }) {
  const { cx, cy, rx } = a.head
  const female = a.gender === 'female'
  const y = female ? cy - 1 : cy + 1
  const spread = female ? 13 : 14
  const ink = '#3A2C28'
  return (
    <g>
      {female && (
        <>
          <ellipse cx={cx - spread - 4} cy={y + 10} rx={9} ry={5} fill="#E7A394" opacity={0.35} />
          <ellipse cx={cx + spread + 4} cy={y + 10} rx={9} ry={5} fill="#E7A394" opacity={0.35} />
        </>
      )}
      <path
        d={`M ${cx - spread - 7} ${y - 10} Q ${cx - spread} ${y - 15} ${cx - spread + 7} ${y - 9}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx + spread - 7} ${y - 9} Q ${cx + spread} ${y - 15} ${cx + spread + 7} ${y - 10}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <ellipse cx={cx - spread} cy={y} rx={6.4} ry={3.6} fill={ink} />
      <ellipse cx={cx + spread} cy={y} rx={6.4} ry={3.6} fill={ink} />
      <ellipse cx={cx - spread + 2} cy={y - 1.1} rx={1.5} ry={1.1} fill="#fff" opacity={0.9} />
      <ellipse cx={cx + spread + 2} cy={y - 1.1} rx={1.5} ry={1.1} fill="#fff" opacity={0.9} />
      <path
        d={`M ${cx - 1.5} ${y + 12} Q ${cx + 1} ${y + 20} ${cx + 5} ${y + 13}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.15}
        strokeLinecap="round"
        opacity={0.65}
      />
      {female ? (
        <path
          d={`M ${cx - 6} ${y + 26} Q ${cx} ${y + 31} ${cx + 6} ${y + 26} Q ${cx} ${y + 29} ${cx - 6} ${y + 26}`}
          fill="#C48986"
        />
      ) : (
        <path
          d={`M ${cx - 5} ${y + 26} Q ${cx} ${y + 29} ${cx + 5} ${y + 26}`}
          fill="none"
          stroke="#A86E6C"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
      <path d={`M ${cx - rx + 2} ${cy + 4} Q ${cx - rx - 1} ${cy + 8} ${cx - rx + 3} ${cy + 16}`} fill="none" stroke="#C99278" strokeWidth={1.2} opacity={0.5} />
    </g>
  )
}

function FrontHair({ a, uid }: { a: Anchors; uid: string }) {
  const { cx, cy, rx, ry } = a.head
  if (a.gender === 'male') {
    return (
      <Volume
        uid={uid}
        color="#241C19"
        gloss={0.32}
        d={`M ${round(cx - rx + 1)} ${round(cy + 6)}
          C ${round(cx - rx - 2)} ${round(cy - ry + 8)} ${round(cx - 20)} ${round(cy - ry - 14)} ${cx} ${round(cy - ry - 6)}
          C ${round(cx + 24)} ${round(cy - ry - 16)} ${round(cx + rx + 4)} ${round(cy - ry + 6)} ${round(cx + rx - 1)} ${round(cy + 8)}
          C ${round(cx + 18)} ${round(cy - 6)} ${round(cx - 16)} ${round(cy - 4)} ${round(cx - rx + 1)} ${round(cy + 6)} Z`}
      />
    )
  }
  const lock = (side: -1 | 1) => {
    const x = cx + side * (rx - 6)
    return `M ${round(x)} ${round(cy - 6)}
      C ${round(x + side * 12)} ${round(cy + 18)} ${round(x + side * 16)} ${round(cy + ry - 2)} ${round(x + side * 8)} ${round(cy + ry + 22)}
      C ${round(x + side * 2)} ${round(cy + ry + 6)} ${round(x - side * 2)} ${round(cy + 16)} ${round(x - side * 2)} ${round(cy - 2)} Z`
  }
  return (
    <g>
      <Volume uid={uid} color="#2A211C" gloss={0.28} d={lock(-1)} />
      <Volume uid={uid} color="#2A211C" gloss={0.28} d={lock(1)} />
      <Volume
        uid={uid}
        color="#3A2E28"
        gloss={0.4}
        d={`M ${round(cx - rx + 6)} ${round(cy - ry + 20)}
          C ${round(cx - 8)} ${round(cy - ry + 6)} ${round(cx + 10)} ${round(cy - ry + 4)} ${round(cx + rx - 4)} ${round(cy - ry + 18)}
          C ${round(cx + 6)} ${round(cy - ry + 30)} ${round(cx - 6)} ${round(cy - ry + 30)} ${round(cx - rx + 6)} ${round(cy - ry + 20)} Z`}
      />
    </g>
  )
}

function limb(a: Anchors, kind: 'arm' | 'leg', dir: -1 | 1): string {
  if (kind === 'arm') {
    const { shoulder, elbow, wrist, rs, re, rw } = a.arm
    const raw = dir < 0 ? [shoulder, elbow, wrist] : [mirror(shoulder, a.cx), mirror(elbow, a.cx), mirror(wrist, a.cx)]
    const dx = raw[2][0] - raw[1][0]
    const dy = raw[2][1] - raw[1][1]
    const len = Math.hypot(dx, dy) || 1
    const hand: Pt = [raw[2][0] + (dx / len) * 22, raw[2][1] + (dy / len) * 22]
    return band([...raw, hand], [rs, re, rw, rw + 2])
  }
  const { hip, knee, ankle, rh, rk, ra } = a.leg
  const pts = dir < 0 ? [hip, knee, ankle] : [mirror(hip, a.cx), mirror(knee, a.cx), mirror(ankle, a.cx)]
  return band(pts, [rh, rk, ra])
}

function piece(outfit: Outfit, slot: Slot): { id: string; color: string; spec: DrawSpec } | null {
  if ((slot === 'top' || slot === 'bottom') && outfit.slots.dress) return null
  const worn = outfit.slots[slot]
  if (!worn) return null
  const spec = DRAWS[worn.id]
  if (!spec) return null
  return { id: worn.id, color: colorHex(worn.color), spec }
}

export const FigureSvg = forwardRef<SVGSVGElement, { gender: Gender; outfit: Outfit; title?: string }>(function FigureSvg(
  { gender, outfit, title },
  ref,
) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const anchors = useMemo(() => buildAnchors(gender), [gender])
  const label = title ?? describeOutfit(gender, outfit)
  const { cx, head } = anchors

  return (
    <svg ref={ref} className="figure" viewBox="0 0 400 780" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`${uid}-skin`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#F6D7C4" />
          <stop offset="46%" stopColor="#E4B394" />
          <stop offset="100%" stopColor="#C48B72" />
        </radialGradient>
        <linearGradient id={`${uid}-shade`} gradientUnits="userSpaceOnUse" x1="70" y1="180" x2="230" y2="280">
          <stop offset="0%" stopColor="#000" stopOpacity="0.16" />
          <stop offset="42%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-light`} gradientUnits="userSpaceOnUse" x1="180" y1="80" x2="340" y2="280">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={anchors.y.ground + 6} rx="78" ry="9" fill="rgba(70,48,32,0.14)" />
      {hairBack(anchors) && <Volume uid={uid} color="#241C19" gloss={0.22} d={hairBack(anchors)} />}
      <Skin uid={uid} d={limb(anchors, 'leg', -1)} />
      <Skin uid={uid} d={limb(anchors, 'leg', 1)} />
      <ellipse cx={anchors.leg.ankle[0]} cy={anchors.y.ground - 8} rx={16} ry={7} fill={`url(#${uid}-skin)`} />
      <ellipse cx={mirror(anchors.leg.ankle, cx)[0]} cy={anchors.y.ground - 8} rx={16} ry={7} fill={`url(#${uid}-skin)`} />
      <Skin uid={uid} d={limb(anchors, 'arm', -1)} />
      <Skin uid={uid} d={limb(anchors, 'arm', 1)} />
      <Skin uid={uid} d={torsoPath(anchors)} />
      <Skin uid={uid} d={neckPath(anchors)} />
      <ellipse cx={cx - head.rx + 2} cy={head.cy + 4} rx={6} ry={9} fill={`url(#${uid}-skin)`} />
      <ellipse cx={cx + head.rx - 2} cy={head.cy + 4} rx={6} ry={9} fill={`url(#${uid}-skin)`} />
      <Skin uid={uid} d={headPath(anchors)} />
      <Face a={anchors} />
      <FrontHair a={anchors} uid={uid} />
      {(['bottom', 'dress', 'top', 'belt'] as Slot[]).map((slot) => renderPiece(outfit, slot, anchors, uid))}
      {renderNeck(outfit, anchors, uid, 'tie')}
      {(['outer', 'coat'] as Slot[]).map((slot) => renderPiece(outfit, slot, anchors, uid))}
      {renderNeck(outfit, anchors, uid, 'scarf')}
      {(['shoes', 'hat', 'glasses', 'bag'] as Slot[]).map((slot) => renderPiece(outfit, slot, anchors, uid))}
    </svg>
  )
})

function renderPiece(outfit: Outfit, slot: Slot, anchors: Anchors, uid: string) {
  const item = piece(outfit, slot)
  if (!item) return null
  return (
    <g key={`${item.id}-${item.color}-${slot}`} className="piece">
      <GarmentShape a={anchors} spec={item.spec} color={item.color} uid={uid} />
    </g>
  )
}

function renderNeck(outfit: Outfit, anchors: Anchors, uid: string, style: 'tie' | 'scarf') {
  const item = piece(outfit, 'neck')
  if (!item || item.spec.kind !== 'neck' || item.spec.style !== style) return null
  return (
    <g key={`${item.id}-${item.color}`} className="piece">
      <GarmentShape a={anchors} spec={item.spec} color={item.color} uid={uid} />
    </g>
  )
}
