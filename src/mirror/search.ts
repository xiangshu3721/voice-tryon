/**
 * 镜子模式的中文指令解析：在 AI 生成的衣库里搜衣服。
 * 例：「换件老钱风的外套」「来条黑色阔腿裤」「试试新中式」「脱掉外套」「换男装」
 */
import { matchColor } from '../palette'
import type { ColorId, Gender } from '../types'
import type { Category } from './fit'
import {
  clearAll,
  switchGender,
  takeOff,
  undo,
  wear,
  wearLook,
  type MirrorSession,
} from './session'
import { CATEGORY_LABEL, garmentsOf, STYLES, styleOf, type PhotoGarment } from './wardrobe'

export type MirrorIntent =
  | 'gender'
  | 'look'
  | 'wear'
  | 'next'
  | 'remove'
  | 'clear'
  | 'undo'
  | 'photo'
  | 'random'
  | 'unknown'

export interface MirrorParsed {
  intent: MirrorIntent
  gender?: Gender
  style?: string
  category?: Category
  color?: ColorId
  keyword?: string
}

export interface MirrorTurn {
  intent: MirrorIntent
  reply: string
  session: MirrorSession
  /** 需要界面执行的动作（拍照） */
  effect?: 'photo'
}

export const MIRROR_SUGGESTIONS = ['试试新中式', '换件老钱风的外套', '来条黑色阔腿裤', '来套美拉德', '脱掉外套', '拍一张']
export const MIRROR_SUGGESTIONS_MALE = ['试试新中式', '来套户外的', '换件美拉德夹克', '来条白色牛仔裤', '脱掉外套', '拍一张']

const CATEGORY_WORDS: Array<[string, Category]> = [
  ['连衣裙', 'dress'],
  ['长裙', 'dress'],
  ['半身裙', 'bottom'],
  ['半裙', 'bottom'],
  ['马面裙', 'bottom'],
  ['羽绒服', 'outer'],
  ['面包服', 'outer'],
  ['冲锋衣', 'outer'],
  ['棒球服', 'outer'],
  ['大衣', 'outer'],
  ['外套', 'outer'],
  ['夹克', 'outer'],
  ['西装', 'outer'],
  ['西服', 'outer'],
  ['开衫', 'outer'],
  ['风衣', 'outer'],
  ['唐装', 'outer'],
  ['外搭', 'outer'],
  ['裤子', 'bottom'],
  ['裤', 'bottom'],
  ['下装', 'bottom'],
  ['衬衫', 'top'],
  ['衬衣', 'top'],
  ['毛衣', 'top'],
  ['针织', 'top'],
  ['卫衣', 'top'],
  ['t恤', 'top'],
  ['polo', 'top'],
  ['抓绒', 'top'],
  ['摇粒绒', 'top'],
  ['羊绒衫', 'top'],
  ['打底', 'top'],
  ['上衣', 'top'],
  ['内搭', 'top'],
]
const SORTED_CATS = [...CATEGORY_WORDS].sort((a, b) => b[0].length - a[0].length)

export function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s，。！？、~～….!?；;：:“”"'‘’]/g, '')
    .replace(/^(?:好的|好|请你|请|帮我|给我|嗯+|啊+|哦+|那就|那)+/, '')
}

function matchCategory(text: string, gender: Gender): Category | undefined {
  for (const [w, c] of SORTED_CATS) {
    if (!text.includes(w)) continue
    // 「裙子」：女装默认连衣裙
    return c
  }
  if (text.includes('裙')) return gender === 'female' ? 'dress' : undefined
  return undefined
}

export function matchStyle(text: string, gender: Gender): string | undefined {
  let best: { id: string; len: number } | undefined
  for (const s of STYLES[gender]) {
    for (const word of [s.name, ...s.aliases]) {
      if (text.includes(word.toLowerCase()) && (!best || word.length > best.len)) best = { id: s.id, len: word.length }
    }
  }
  return best?.id
}

function matchKeyword(text: string, gender: Gender): string | undefined {
  let best: string | undefined
  for (const g of garmentsOf(gender)) {
    for (const k of g.keywords) {
      const kk = k.toLowerCase()
      if (kk.length >= 2 && text.includes(kk) && (!best || kk.length > best.length)) best = kk
    }
  }
  return best
}

function matchGender(text: string): Gender | undefined {
  if (/男装|男生|男款|换成男|看看男|换男|男士/.test(text)) return 'male'
  if (/女装|女生|女款|换成女|看看女|换女|女士/.test(text)) return 'female'
  return undefined
}

export function parseMirror(raw: string, gender: Gender): MirrorParsed {
  const text = normalize(raw)
  if (!text) return { intent: 'unknown' }
  const g = matchGender(text)
  if (/撤销|上一套|刚才那套|回到刚才|退回/.test(text)) return { intent: 'undo' }
  if (/拍照|拍一张|拍张|照一张|合影|截图|保存图片|存图/.test(text)) return { intent: 'photo' }
  const pool: Gender = g ?? gender
  const style = matchStyle(text, pool)
  const category = matchCategory(text, pool)
  const color = matchColor(text)?.color
  const keyword = matchKeyword(text, pool)

  if (/全脱|都脱|清空|全部脱|脱光|全去掉/.test(text)) return { intent: 'clear' }
  if (/脱掉|脱了|脱下|去掉|拿掉|不要|不穿/.test(text)) return { intent: 'remove', category }
  if (g && !style && !category && !keyword) return { intent: 'gender', gender: g }
  if (/随便|随机|你决定|帮我挑|看你的|搭一套/.test(text) && !style && !category) return { intent: 'random', gender: g }
  if (/^(?:换一件|换件别的|下一件|换个别的|再换|换一个|再来一件|还有吗|别的)$/.test(text)) return { intent: 'next' }
  if (style && !category && !keyword && !color) return { intent: 'look', style, gender: g }
  if (category || keyword || color || style) return { intent: 'wear', style, category, color, keyword, gender: g }
  return { intent: 'unknown' }
}

function score(g: PhotoGarment, p: MirrorParsed): number {
  let s = 0
  if (p.style && g.style === p.style) s += 4
  if (p.color && g.color === p.color) s += 3
  if (p.keyword && g.keywords.some((k) => k.toLowerCase() === p.keyword)) s += 5
  else if (p.keyword && g.keywords.some((k) => k.toLowerCase().includes(p.keyword!))) s += 3
  return s
}

/** 衣库搜索：类别是硬条件，风格 / 颜色 / 关键词打分。 */
export function searchGarments(gender: Gender, p: MirrorParsed, excludeId?: string): PhotoGarment[] {
  let pool = garmentsOf(gender)
  if (p.category) pool = pool.filter((g) => g.category === p.category)
  return pool
    .map((g) => ({ g, s: score(g, p) - (g.id === excludeId ? 0.5 : 0) }))
    .filter((x) => x.s > 0 || (!p.style && !p.color && !p.keyword))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.g)
}

function styleName(gender: Gender, id?: string) {
  return id ? styleOf(gender, id)?.name ?? '' : ''
}

export function interpretMirror(raw: string, s: MirrorSession, rng: () => number = Math.random): MirrorTurn {
  const p = parseMirror(raw, s.gender)
  let session = s
  if (p.gender && p.gender !== s.gender && p.intent !== 'gender') session = switchGender(s, p.gender)

  switch (p.intent) {
    case 'undo': {
      if (!s.past.length) return { intent: 'undo', reply: '已经是第一套了。', session: s }
      return { intent: 'undo', reply: '回到上一套。', session: undo(s) }
    }
    case 'photo':
      return { intent: 'photo', reply: '咔嚓，存好了。', session: s, effect: 'photo' }
    case 'clear':
      return { intent: 'clear', reply: '都脱下了。', session: clearAll(s) }
    case 'remove': {
      const cat = p.category ?? s.focus
      if (!cat || !s.worn[cat]) {
        const first = (['outer', 'top', 'dress', 'bottom'] as Category[]).find((c) => s.worn[c])
        if (!first) return { intent: 'remove', reply: '身上还没有衣服。', session: s }
        return { intent: 'remove', reply: `脱掉${CATEGORY_LABEL[first]}。`, session: takeOff(s, first) }
      }
      return { intent: 'remove', reply: `脱掉${CATEGORY_LABEL[cat]}。`, session: takeOff(s, cat) }
    }
    case 'gender': {
      const who = p.gender === 'male' ? '男装' : '女装'
      if (p.gender === s.gender) return { intent: 'gender', reply: `现在就是${who}。`, session: s }
      return { intent: 'gender', reply: `换到${who}衣柜。`, session: switchGender(s, p.gender!) }
    }
    case 'look': {
      const next = wearLook(session, p.style!)
      return { intent: 'look', reply: `来一套${styleName(session.gender, p.style)}。`, session: next }
    }
    case 'random': {
      const styles = STYLES[session.gender]
      const pick = styles[Math.floor(rng() * styles.length) % styles.length]
      return { intent: 'random', reply: `试试${pick.name}。`, session: wearLook(session, pick.id) }
    }
    case 'next': {
      const cat = s.focus ?? 'top'
      const pool = garmentsOf(s.gender).filter((g) => g.category === cat)
      if (!pool.length) return { intent: 'next', reply: '这一类没有别的了。', session: s }
      const i = pool.findIndex((g) => g.id === s.worn[cat])
      const g = pool[(i + 1) % pool.length]
      return { intent: 'next', reply: `换成${g.name}。`, session: wear(s, g.id) }
    }
    case 'wear': {
      const found = searchGarments(session.gender, p, session.worn[p.category ?? 'top'])
      const g = found[0]
      if (!g) {
        const what = p.category ? CATEGORY_LABEL[p.category] : '这件'
        return { intent: 'wear', reply: `衣柜里还没有${what}。换个说法试试。`, session }
      }
      const exactColor = !p.color || g.color === p.color
      const reply = exactColor ? `换上${g.name}。` : `没有完全一样颜色的，先试${g.name}。`
      return { intent: 'wear', reply, session: wear(session, g.id) }
    }
    default:
      return {
        intent: 'unknown',
        reply: '这句我还没接住。可以说「试试新中式」「换件老钱风的外套」「来条黑色阔腿裤」。',
        session: s,
      }
  }
}
