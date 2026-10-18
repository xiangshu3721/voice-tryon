import type { ColorId } from './types'

export interface Swatch {
  id: ColorId
  name: string
  hex: string
}

export const PALETTE: Record<ColorId, Swatch> = {
  black: { id: 'black', name: '黑色', hex: '#1C1C1C' },
  white: { id: 'white', name: '白色', hex: '#F6F3EE' },
  gray: { id: 'gray', name: '灰色', hex: '#8D8882' },
  beige: { id: 'beige', name: '米色', hex: '#D9C4A4' },
  blue: { id: 'blue', name: '蓝色', hex: '#3E5C76' },
  red: { id: 'red', name: '红色', hex: '#8E3030' },
  green: { id: 'green', name: '绿色', hex: '#2E5648' },
  pink: { id: 'pink', name: '粉色', hex: '#E4B4C2' },
  yellow: { id: 'yellow', name: '黄色', hex: '#E0C36A' },
  brown: { id: 'brown', name: '棕色', hex: '#6A4632' },
  navy: { id: 'navy', name: '藏青色', hex: '#1B2744' },
  khaki: { id: 'khaki', name: '卡其色', hex: '#C4B48A' },
  camel: { id: 'camel', name: '驼色', hex: '#C6A36A' },
  cream: { id: 'cream', name: '奶油色', hex: '#F3EBDD' },
  burgundy: { id: 'burgundy', name: '酒红色', hex: '#6E2432' },
  oat: { id: 'oat', name: '燕麦色', hex: '#E4D3BE' },
  orange: { id: 'orange', name: '橙色', hex: '#D47A45' },
  purple: { id: 'purple', name: '紫色', hex: '#6E4A78' },
}

export function isColor(value: string): value is ColorId {
  return Object.prototype.hasOwnProperty.call(PALETTE, value)
}

export function colorHex(id: ColorId): string {
  return PALETTE[id].hex
}

export function colorName(id: ColorId): string {
  return PALETTE[id].name
}

export function tone(hex: string, amount: number): string {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const num = Number.parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const target = amount > 0 ? 255 : 0
  const p = Math.min(1, Math.abs(amount))
  const mix = (c: number) => Math.round(c + (target - c) * p)
  const to = (c: number) => c.toString(16).padStart(2, '0')
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`
}

/** Longest word first so「藏青色」不会被「青色」截走。 */
export const COLOR_WORDS: Array<[string, ColorId]> = [
  ['藏青色', 'navy'],
  ['海军蓝', 'navy'],
  ['深蓝色', 'navy'],
  ['雾霾蓝', 'blue'],
  ['墨绿色', 'green'],
  ['酒红色', 'burgundy'],
  ['燕麦色', 'oat'],
  ['奶油色', 'cream'],
  ['卡其色', 'khaki'],
  ['咖啡色', 'brown'],
  ['藏青色', 'navy'],
  ['橙色', 'orange'],
  ['紫色', 'purple'],
  ['藏青', 'navy'],
  ['深蓝', 'navy'],
  ['墨绿', 'green'],
  ['酒红', 'burgundy'],
  ['卡其', 'khaki'],
  ['驼色', 'camel'],
  ['米白', 'cream'],
  ['棕色', 'brown'],
  ['褐色', 'brown'],
  ['灰色', 'gray'],
  ['黑色', 'black'],
  ['白色', 'white'],
  ['米色', 'beige'],
  ['红色', 'red'],
  ['蓝色', 'blue'],
  ['绿色', 'green'],
  ['粉色', 'pink'],
  ['黄色', 'yellow'],
  ['咖色', 'brown'],
  ['橙色', 'orange'],
  ['紫色', 'purple'],
]

const SHORT_COLOR: Array<[RegExp, ColorId]> = [
  [/白的/, 'white'],
  [/黑的/, 'black'],
  [/红的/, 'red'],
  [/蓝的/, 'blue'],
  [/绿的/, 'green'],
  [/粉的/, 'pink'],
  [/黄的/, 'yellow'],
  [/灰的/, 'gray'],
  [/棕的/, 'brown'],
  [/米的/, 'beige'],
  [/驼的/, 'camel'],
  [/橙的/, 'orange'],
  [/紫的/, 'purple'],
  [/(?:换|改成|变成)白(?!菜)/, 'white'],
  [/(?:换|改成|变成)黑/, 'black'],
  [/(?:换|改成|变成)红/, 'red'],
  [/(?:换|改成|变成)蓝/, 'blue'],
  [/(?:换|改成|变成)绿/, 'green'],
  [/(?:换|改成|变成)粉/, 'pink'],
  [/(?:换|改成|变成)黄/, 'yellow'],
]

export function matchColor(text: string): { color: ColorId; word: string } | null {
  const sorted = [...COLOR_WORDS].sort((a, b) => b[0].length - a[0].length)
  for (const [word, color] of sorted) {
    if (text.includes(word)) return { color, word }
  }
  for (const [re, color] of SHORT_COLOR) {
    const found = re.exec(text)
    if (found) return { color, word: found[0] }
  }
  return null
}
