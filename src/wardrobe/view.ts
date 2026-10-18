import { colorName } from '../palette'
import { SLOT_ORDER, type Gender, type Outfit, type Slot } from '../types'
import { garmentById } from './catalog'

export interface WornLine {
  slot: Slot
  id: string
  name: string
  colorName: string
  label: string
}

export function wornLines(gender: Gender, outfit: Outfit): WornLine[] {
  const lines: WornLine[] = []
  for (const slot of SLOT_ORDER) {
    if ((slot === 'top' || slot === 'bottom') && outfit.slots.dress) continue
    const worn = outfit.slots[slot]
    if (!worn) continue
    const garment = garmentById(gender, worn.id)
    if (!garment) continue
    const name = garment.name
    const cName = colorName(worn.color)
    lines.push({
      slot,
      id: worn.id,
      name,
      colorName: cName,
      label: `${cName}${name}`,
    })
  }
  return lines
}

export function describeOutfit(gender: Gender, outfit: Outfit): string {
  const who = gender === 'female' ? '女装模特' : '男装模特'
  const lines = wornLines(gender, outfit)
  if (lines.length === 0) return `${who}，还没换衣服`
  return `${who}，穿着${lines.map((line) => line.label).join('、')}`
}

export function outfitSummary(outfit: Outfit): string {
  return SLOT_ORDER.filter((slot) => outfit.slots[slot])
    .map((slot) => {
      const worn = outfit.slots[slot]!
      return `${slot}:${worn.id}:${worn.color}`
    })
    .join('|')
}
