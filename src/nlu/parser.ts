import { matchColor } from '../palette'
import type { ColorId, Gender, Slot, Style } from '../types'

export type Intent =
  | 'recommend'
  | 'specify'
  | 'recolor'
  | 'add'
  | 'remove'
  | 'undo'
  | 'random'
  | 'save'
  | 'switch-gender'
  | 'unknown'

export interface ParseContext {
  gender: Gender
  focus?: Slot
}

export interface Parsed {
  intent: Intent
  tag?: string
  color?: ColorId
  style?: Style
  gender?: Gender
  /** 没点名衣服时，沿用上一句焦点。例如先说裙子，再说「白色的呢」。 */
  target?: Slot
  suggestions: string[]
}

export const SUGGESTIONS = ['来套通勤', '换白色', '加件外套', '约会穿什么', '来套休闲', '保存这套']

const STYLE_WORDS: Array<[string, Style]> = [
  ['新中式', 'newchinese'],
  ['通勤', 'commute'],
  ['上班', 'commute'],
  ['办公', 'commute'],
  ['休闲', 'casual'],
  ['松弛', 'casual'],
  ['日常', 'casual'],
  ['约会', 'date'],
  ['浪漫', 'date'],
  ['运动', 'sport'],
  ['健身', 'sport'],
  ['跑步', 'sport'],
  ['商务', 'business'],
  ['正式', 'formal'],
  ['面试', 'formal'],
  ['婚礼', 'formal'],
  ['度假', 'resort'],
  ['海边', 'resort'],
  ['旅行', 'resort'],
  ['冬天', 'winter'],
  ['冬季', 'winter'],
  ['夏天', 'summer'],
  ['夏季', 'summer'],
]

const ITEM_WORDS: Array<[string, string]> = [
  ['荷叶边裙', 'ruffle'],
  ['荷叶边', 'ruffle'],
  ['牛仔裤', 'jeans'],
  ['百褶裙', 'pleat'],
  ['衬衫裙', 'shirtdress'],
  ['吊带裙', 'slip'],
  ['连衣裙', 'dress'],
  ['直筒裙', 'column'],
  ['长裙', 'column'],
  ['半裙', 'skirt'],
  ['裙子', 'dress'],
  ['皮夹克', 'jacket'],
  ['皮衣', 'jacket'],
  ['牛仔外套', 'denim'],
  ['牛仔夹克', 'denim'],
  ['西装外套', 'blazer'],
  ['针织开衫', 'cardigan'],
  ['开衫', 'cardigan'],
  ['棒球夹克', 'bomber'],
  ['高领毛衣', 'turtleneck'],
  ['高领', 'turtleneck'],
  ['毛衣', 'turtleneck'],
  ['卫衣', 'hoodie'],
  ['丝质衬衫', 'silk'],
  ['亚麻衬衫', 'linen'],
  ['立领上衣', 'mandarin'],
  ['立领', 'mandarin'],
  ['短上衣', 'crop'],
  ['polo衫', 'polo'],
  ['polo', 'polo'],
  ['t恤', 'tee'],
  ['衬衫', 'shirt'],
  ['吊带', 'cami'],
  ['上衣', 'top'],
  ['阔腿裤', 'wide'],
  ['运动裤', 'jogger'],
  ['工装裤', 'cargo'],
  ['卡其裤', 'chinos'],
  ['西裤', 'tailored'],
  ['短裤', 'shorts'],
  ['长裤', 'pants'],
  ['裤子', 'pants'],
  ['风衣', 'trench'],
  ['大衣', 'coat'],
  ['夹克', 'jacket'],
  ['西装', 'blazer'],
  ['外套', 'outer'],
  ['高跟鞋', 'heel'],
  ['运动鞋', 'sneaker'],
  ['牛津鞋', 'oxford'],
  ['乐福鞋', 'loafer'],
  ['凉鞋', 'sandal'],
  ['短靴', 'boot'],
  ['靴子', 'boot'],
  ['贝雷帽', 'beret'],
  ['棒球帽', 'cap'],
  ['草帽', 'straw'],
  ['冷帽', 'beanie'],
  ['帽子', 'hat'],
  ['围巾', 'scarf'],
  ['领带', 'tie'],
  ['眼镜', 'glasses'],
  ['墨镜', 'glasses'],
  ['腰带', 'belt'],
  ['手提包', 'tote'],
  ['公文包', 'brief'],
  ['包包', 'bag'],
  ['鞋子', 'shoes'],
  ['鞋', 'shoes'],
  ['包', 'bag'],
]

const GENERIC_TAGS = new Set(['dress', 'top', 'bottom', 'outer', 'shoes', 'hat', 'pants', 'column', 'long'])

const SORTED_ITEMS = [...ITEM_WORDS].sort((a, b) => b[0].length - a[0].length)
const SORTED_STYLES = [...STYLE_WORDS].sort((a, b) => b[0].length - a[0].length)

export function normalizeUtterance(raw: string): string {
  let text = raw.trim().toLowerCase()
  text = text.replace(/[\s，。！？、~～….!?；;：:“”"'‘’]/g, '')
  text = text.replace(/^(?:好的|好|请你|请|帮我|给我|嗯+|啊+|哦+|那就|那)+/, '')
  text = text.replace(/(?:一下|吧|呢|呀|哦|嘛|哈)+$/g, '')
  return text
}

export function matchItem(text: string): { word: string; tag: string } | null {
  for (const [word, tag] of SORTED_ITEMS) {
    if (text.includes(word)) return { word, tag }
  }
  return null
}

function matchStyle(text: string): Style | undefined {
  for (const [word, style] of SORTED_STYLES) {
    if (text.includes(word)) return style
  }
  return undefined
}

function matchGender(text: string): Gender | undefined {
  if (/男装|男生|男模特|换成男|看看男|换男|男的/.test(text)) return 'male'
  if (/女装|女生|女模特|换成女|看看女|换女|女的/.test(text)) return 'female'
  return undefined
}

function colorOnly(text: string): boolean {
  const rest = text.replace(
    /藏青色|海军蓝|深蓝色|雾霾蓝|墨绿色|酒红色|燕麦色|奶油色|卡其色|咖啡色|藏青|深蓝|墨绿|酒红|卡其|驼色|米白|棕色|褐色|灰色|黑色|白色|米色|红色|蓝色|绿色|粉色|黄色|咖色|橙色|紫色|白的|黑的|红的|蓝的|绿的|粉的|黄的|灰的|棕的|米的|换|成|改|要|的|色|点|件|一/g,
    '',
  )
  return rest.length === 0
}

export function parseUtterance(raw: string, ctx: ParseContext): Parsed {
  const text = normalizeUtterance(raw)
  const base = { suggestions: SUGGESTIONS }
  if (!text) return { intent: 'unknown', ...base }

  const color = matchColor(text)?.color
  const tag = matchItem(text)?.tag
  const style = matchStyle(text)
  const gender = matchGender(text)

  if (/刚才那套|上一套|上套|撤销|还是刚才|回到刚才|退回上一/.test(text)) {
    return { intent: 'undo', ...base }
  }
  if (/保存|收藏|存起来|存下|记下这套/.test(text)) {
    return { intent: 'save', ...base }
  }
  if (gender && !style && !tag) {
    return { intent: 'switch-gender', gender, ...base }
  }
  if (/随便|随机|你决定|帮我定|看你的/.test(text) && !style && !tag) {
    return { intent: 'random', ...base }
  }
  if (/脱了|脱掉|脱下|去掉|取下|摘掉|摘了|不要|别要|不用|拿掉/.test(text)) {
    return { intent: 'remove', tag, ...base }
  }
  if (/^(?:再加|加|叠|配)|加一|加件|加条|加双|加顶|戴顶|戴个|戴条|戴一|背上|挎上/.test(text)) {
    return { intent: 'add', tag, color, ...base }
  }

  const namedPiece =
    Boolean(tag) && !GENERIC_TAGS.has(tag!) && /来|穿|换成|换件|换条|换双|换上/.test(text)

  if (color && !namedPiece && (colorOnly(text) || /换|改成|变成/.test(text))) {
    return {
      intent: 'recolor',
      tag,
      color,
      target: tag ? undefined : ctx.focus,
      ...base,
    }
  }

  if (tag && !GENERIC_TAGS.has(tag) && /来|换|穿|要|配|搭/.test(text)) {
    return { intent: 'specify', tag, color, ...base }
  }

  if (gender && style) {
    return { intent: 'switch-gender', gender, style, ...base }
  }

  if (style || /搭|来套|穿什么|怎么穿|出门/.test(text)) {
    return { intent: 'recommend', tag, color, style, ...base }
  }

  if (tag) {
    return { intent: 'specify', tag, color, ...base }
  }

  if (color) {
    return { intent: 'recolor', color, target: ctx.focus, ...base }
  }

  return { intent: 'unknown', ...base }
}
