export type Gender = 'female' | 'male'

export type Slot =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outer'
  | 'coat'
  | 'shoes'
  | 'hat'
  | 'neck'
  | 'bag'
  | 'glasses'
  | 'belt'

export const SLOT_ORDER: Slot[] = [
  'dress',
  'top',
  'bottom',
  'outer',
  'coat',
  'belt',
  'shoes',
  'neck',
  'hat',
  'bag',
  'glasses',
]

export type ColorId =
  | 'black'
  | 'white'
  | 'gray'
  | 'beige'
  | 'blue'
  | 'red'
  | 'green'
  | 'pink'
  | 'yellow'
  | 'brown'
  | 'navy'
  | 'khaki'
  | 'camel'
  | 'cream'
  | 'burgundy'
  | 'oat'
  | 'orange'
  | 'purple'

export type Style =
  | 'commute'
  | 'casual'
  | 'date'
  | 'sport'
  | 'formal'
  | 'business'
  | 'resort'
  | 'winter'
  | 'summer'
  | 'newchinese'

export interface Worn {
  id: string
  color: ColorId
}

export interface Outfit {
  slots: Partial<Record<Slot, Worn>>
}

export function emptyOutfit(): Outfit {
  return { slots: {} }
}
