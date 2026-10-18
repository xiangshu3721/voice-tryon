import type { ColorId, Gender, Outfit, Slot, Style } from '../types'

type Spec = Partial<Record<Slot, [string, ColorId]>>

function outfit(spec: Spec): Outfit {
  const slots: Outfit['slots'] = {}
  for (const [slot, pair] of Object.entries(spec) as Array<[Slot, [string, ColorId]]>) {
    slots[slot] = { id: pair[0], color: pair[1] }
  }
  return { slots }
}

const female: Record<Style, Outfit> = {
  commute: outfit({
    top: ['top-shirt', 'white'],
    bottom: ['bottom-tailored', 'black'],
    outer: ['outer-blazer', 'black'],
    belt: ['belt-slim', 'black'],
    shoes: ['shoes-loafer', 'black'],
  }),
  casual: outfit({
    top: ['top-crop', 'white'],
    bottom: ['bottom-trouser', 'beige'],
    belt: ['belt-slim', 'brown'],
    shoes: ['shoes-sneaker', 'white'],
  }),
  date: outfit({
    dress: ['dress-slip', 'burgundy'],
    shoes: ['shoes-heel', 'black'],
    bag: ['bag-tote', 'black'],
  }),
  sport: outfit({
    top: ['top-hoodie', 'gray'],
    bottom: ['bottom-jogger', 'black'],
    shoes: ['shoes-sneaker', 'white'],
  }),
  formal: outfit({
    top: ['top-shirt', 'white'],
    bottom: ['bottom-tailored', 'black'],
    outer: ['outer-blazer', 'black'],
    shoes: ['shoes-heel', 'black'],
  }),
  business: outfit({
    top: ['top-silk', 'cream'],
    bottom: ['bottom-tailored', 'black'],
    outer: ['outer-blazer', 'navy'],
    shoes: ['shoes-heel', 'black'],
  }),
  resort: outfit({
    top: ['top-silk', 'white'],
    bottom: ['bottom-shorts', 'beige'],
    shoes: ['shoes-sandal', 'camel'],
    hat: ['hat-straw', 'oat'],
  }),
  winter: outfit({
    top: ['top-turtleneck', 'cream'],
    bottom: ['bottom-trouser', 'black'],
    coat: ['coat-wool', 'camel'],
    shoes: ['shoes-boot', 'brown'],
    neck: ['neck-scarf', 'burgundy'],
  }),
  summer: outfit({
    top: ['top-tee', 'white'],
    bottom: ['bottom-midi', 'blue'],
    shoes: ['shoes-sandal', 'brown'],
  }),
  newchinese: outfit({
    top: ['top-mandarin', 'cream'],
    bottom: ['bottom-wide', 'black'],
    shoes: ['shoes-loafer', 'black'],
  }),
}

const male: Record<Style, Outfit> = {
  commute: outfit({
    top: ['top-shirt', 'oat'],
    bottom: ['bottom-chinos', 'navy'],
    outer: ['outer-blazer', 'navy'],
    shoes: ['shoes-loafer', 'brown'],
  }),
  casual: outfit({
    top: ['top-tee', 'white'],
    bottom: ['bottom-chinos', 'khaki'],
    shoes: ['shoes-sneaker', 'white'],
  }),
  date: outfit({
    top: ['top-knit', 'black'],
    bottom: ['bottom-trouser', 'black'],
    shoes: ['shoes-loafer', 'brown'],
  }),
  sport: outfit({
    top: ['top-hoodie', 'gray'],
    bottom: ['bottom-jogger', 'black'],
    shoes: ['shoes-sneaker', 'white'],
  }),
  formal: outfit({
    top: ['top-shirt', 'white'],
    bottom: ['bottom-trouser', 'black'],
    outer: ['outer-blazer', 'navy'],
    neck: ['neck-tie', 'navy'],
    shoes: ['shoes-oxford', 'black'],
  }),
  business: outfit({
    top: ['top-shirt', 'white'],
    bottom: ['bottom-trouser', 'black'],
    outer: ['outer-blazer', 'black'],
    belt: ['belt-slim', 'brown'],
    neck: ['neck-tie', 'burgundy'],
    shoes: ['shoes-oxford', 'black'],
  }),
  resort: outfit({
    top: ['top-linen', 'white'],
    bottom: ['bottom-shorts', 'beige'],
    shoes: ['shoes-sandal', 'brown'],
    hat: ['hat-cap', 'oat'],
  }),
  winter: outfit({
    top: ['top-turtleneck', 'gray'],
    bottom: ['bottom-trouser', 'black'],
    coat: ['coat-wool', 'camel'],
    shoes: ['shoes-boot', 'brown'],
    neck: ['neck-scarf', 'burgundy'],
  }),
  summer: outfit({
    top: ['top-tee', 'blue'],
    bottom: ['bottom-shorts', 'khaki'],
    shoes: ['shoes-sneaker', 'white'],
  }),
  newchinese: outfit({
    top: ['top-mandarin', 'black'],
    bottom: ['bottom-trouser', 'black'],
    shoes: ['shoes-loafer', 'brown'],
  }),
}

export const PRESETS: Record<Gender, Record<Style, Outfit>> = { female, male }

export const STYLE_ORDER: Style[] = [
  'commute',
  'casual',
  'date',
  'sport',
  'formal',
  'business',
  'resort',
  'winter',
  'summer',
  'newchinese',
]

export const STYLE_NAMES: Record<Style, string> = {
  commute: '通勤',
  casual: '休闲',
  date: '约会',
  sport: '运动',
  formal: '正式',
  business: '商务',
  resort: '度假',
  winter: '冬天',
  summer: '夏天',
  newchinese: '新中式',
}

export function dressLook(): Outfit {
  return outfit({
    dress: ['dress-column', 'black'],
    shoes: ['shoes-heel', 'black'],
  })
}

export function cloneOutfit(outfitValue: Outfit): Outfit {
  return {
    slots: Object.fromEntries(
      Object.entries(outfitValue.slots).map(([slot, worn]) => [slot, worn ? { ...worn } : worn]),
    ),
  }
}
