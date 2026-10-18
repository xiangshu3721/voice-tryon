import type { Gender, Outfit } from '../types'
import { isColor } from '../palette'
import { SLOT_ORDER } from '../types'
import { garmentById } from '../wardrobe/catalog'
import { STYLE_NAMES } from '../wardrobe/presets'
import type { Style } from '../types'

const KEY = 'yanyi.looks.v1'
const PREF = 'yanyi.prefs.v1'

export interface SavedLook {
  id: string
  name: string
  gender: Gender
  outfit: Outfit
  createdAt: number
}

export interface Prefs {
  speak: boolean
}

function validOutfit(gender: Gender, outfit: Outfit): boolean {
  if (!outfit || typeof outfit !== 'object' || !outfit.slots) return false
  return Object.entries(outfit.slots).every(([slot, worn]) => {
    if (!SLOT_ORDER.includes(slot as (typeof SLOT_ORDER)[number])) return false
    if (!worn) return false
    return Boolean(garmentById(gender, worn.id) && isColor(worn.color))
  })
}

export function loadLooks(): SavedLook[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((item): item is SavedLook => {
      if (!item || typeof item !== 'object') return false
      const look = item as SavedLook
      return (
        (look.gender === 'female' || look.gender === 'male') &&
        typeof look.id === 'string' &&
        typeof look.name === 'string' &&
        typeof look.createdAt === 'number' &&
        validOutfit(look.gender, look.outfit)
      )
    })
  } catch {
    return []
  }
}

export function saveLooks(looks: SavedLook[]): void {
  localStorage.setItem(KEY, JSON.stringify(looks))
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF)
    if (!raw) return { speak: false }
    const data = JSON.parse(raw) as Prefs
    return { speak: Boolean(data.speak) }
  } catch {
    return { speak: false }
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREF, JSON.stringify(prefs))
}

export function lookTitle(outfit: Outfit, gender: Gender, style?: Style): string {
  if (style && STYLE_NAMES[style]) return STYLE_NAMES[style]
  const first = Object.values(outfit.slots)[0]
  if (!first) return '这一身'
  return garmentById(gender, first.id)?.name ?? '这一身'
}

export function formatWhen(ts: number, now = Date.now()): string {
  const date = new Date(ts)
  const hm = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (new Date(now).toDateString() === date.toDateString()) return `今天 ${hm}`
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`
}
