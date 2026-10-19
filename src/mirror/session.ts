import type { Gender } from '../types'
import type { Category } from './fit'
import { CATEGORY_LABEL, garmentOf, garmentsOf, LAYER_ORDER, styleOf, type PhotoGarment } from './wardrobe'

export type Worn = Partial<Record<Category, string>>

export interface MirrorSession {
  gender: Gender
  worn: Worn
  focus?: Category
  lastStyle?: string
  past: Array<{ gender: Gender; worn: Worn }>
}

export function initialMirror(gender: Gender = 'female'): MirrorSession {
  return { gender, worn: {}, past: [] }
}

function push(s: MirrorSession): MirrorSession['past'] {
  return [...s.past, { gender: s.gender, worn: s.worn }].slice(-20)
}

/** 穿上一件：连衣裙和上衣/下装互斥。 */
export function wearInto(worn: Worn, g: PhotoGarment): Worn {
  const next: Worn = { ...worn, [g.category]: g.id }
  if (g.category === 'dress') {
    delete next.top
    delete next.bottom
  }
  if (g.category === 'top' || g.category === 'bottom') delete next.dress
  return next
}

export function wear(s: MirrorSession, id: string): MirrorSession {
  const g = garmentOf(id)
  if (!g || g.gender !== s.gender) return s
  return { ...s, worn: wearInto(s.worn, g), focus: g.category, lastStyle: g.style, past: push(s) }
}

/** 点衣柜：已穿上的再点一下就脱掉。 */
export function toggle(s: MirrorSession, id: string): MirrorSession {
  const g = garmentOf(id)
  if (!g) return s
  if (s.worn[g.category] === id) return takeOff(s, g.category)
  return wear(s, id)
}

export function takeOff(s: MirrorSession, cat: Category): MirrorSession {
  if (!s.worn[cat]) return s
  const worn = { ...s.worn }
  delete worn[cat]
  return { ...s, worn, focus: cat, past: push(s) }
}

export function clearAll(s: MirrorSession): MirrorSession {
  return { ...s, worn: {}, past: push(s) }
}

export function undo(s: MirrorSession): MirrorSession {
  const last = s.past[s.past.length - 1]
  if (!last) return s
  return { ...s, gender: last.gender, worn: last.worn, past: s.past.slice(0, -1) }
}

export function switchGender(s: MirrorSession, gender: Gender): MirrorSession {
  if (gender === s.gender) return s
  return { gender, worn: {}, past: push(s), focus: undefined, lastStyle: undefined }
}

/** 一种风格的整套：有连衣裙就裙 + 外套，否则外套 + 上衣 + 下装。 */
export function lookOf(gender: Gender, style: string): PhotoGarment[] {
  const pool = garmentsOf(gender).filter((g) => g.style === style)
  const pick = (c: Category) => pool.find((g) => g.category === c)
  const dress = pick('dress')
  const out: PhotoGarment[] = []
  const outer = pick('outer')
  if (dress) {
    out.push(dress)
  } else {
    const top = pick('top')
    const bottom = pick('bottom')
    if (top) out.push(top)
    if (bottom) out.push(bottom)
  }
  if (outer) out.push(outer)
  return out
}

export function wearLook(s: MirrorSession, style: string): MirrorSession {
  const items = lookOf(s.gender, style)
  if (!items.length) return s
  let worn: Worn = {}
  for (const g of items) worn = wearInto(worn, g)
  return { ...s, worn, lastStyle: style, focus: undefined, past: push(s) }
}

export interface WornLine {
  category: Category
  garment: PhotoGarment
  label: string
  styleName: string
}

export function wornLines(s: MirrorSession): WornLine[] {
  const lines: WornLine[] = []
  for (const cat of [...LAYER_ORDER].reverse()) {
    const id = s.worn[cat]
    if (!id) continue
    const g = garmentOf(id)
    if (!g) continue
    lines.push({ category: cat, garment: g, label: `${CATEGORY_LABEL[cat]} · ${g.name}`, styleName: styleOf(g.gender, g.style)?.name ?? '' })
  }
  return lines
}

/** 按叠穿顺序返回要画的衣服。 */
export function layers(worn: Worn): PhotoGarment[] {
  const out: PhotoGarment[] = []
  for (const cat of LAYER_ORDER) {
    const id = worn[cat]
    const g = id ? garmentOf(id) : undefined
    if (g) out.push(g)
  }
  return out
}
