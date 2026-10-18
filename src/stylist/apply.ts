import type { Intent, Parsed } from '../nlu/parser'
import { parseUtterance, SUGGESTIONS } from '../nlu/parser'
import { colorName } from '../palette'
import type { ColorId, Gender, Outfit, Slot, Style } from '../types'
import { emptyOutfit } from '../types'
import { findByTag, garmentById, type Garment } from '../wardrobe/catalog'
import { cloneOutfit, dressLook, PRESETS, STYLE_ORDER } from '../wardrobe/presets'

export interface Session {
  gender: Gender
  outfit: Outfit
  focus?: Slot
  past: SessionFrame[]
  lastStyle?: Style
}

interface SessionFrame {
  gender: Gender
  outfit: Outfit
  focus?: Slot
  lastStyle?: Style
}

export type TurnAction = 'apply' | 'save' | 'undo' | 'switch-gender' | 'none'

export interface Turn {
  intent: Intent
  reply: string
  session: Session
  action: TurnAction
  suggestions?: string[]
}

const TAG_SLOT: Record<string, Slot> = {
  top: 'top',
  tee: 'top',
  shirt: 'top',
  crop: 'top',
  hoodie: 'top',
  turtleneck: 'top',
  cami: 'top',
  silk: 'top',
  mandarin: 'top',
  polo: 'top',
  knit: 'top',
  linen: 'top',
  sweater: 'top',
  pants: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  trouser: 'bottom',
  tailored: 'bottom',
  wide: 'bottom',
  jogger: 'bottom',
  cargo: 'bottom',
  chinos: 'bottom',
  bottom: 'bottom',
  skirt: 'bottom',
  pleat: 'bottom',
  column: 'dress',
  ruffle: 'dress',
  slip: 'dress',
  shirtdress: 'dress',
  dress: 'dress',
  long: 'dress',
  jacket: 'outer',
  blazer: 'outer',
  denim: 'outer',
  cardigan: 'outer',
  bomber: 'outer',
  outer: 'outer',
  suit: 'outer',
  coat: 'coat',
  trench: 'coat',
  wool: 'coat',
  shoes: 'shoes',
  sneaker: 'shoes',
  heel: 'shoes',
  loafer: 'shoes',
  boot: 'shoes',
  sandal: 'shoes',
  oxford: 'shoes',
  hat: 'hat',
  beret: 'hat',
  straw: 'hat',
  cap: 'hat',
  beanie: 'hat',
  scarf: 'neck',
  tie: 'neck',
  neck: 'neck',
  bag: 'bag',
  tote: 'bag',
  brief: 'bag',
  glasses: 'glasses',
  belt: 'belt',
}

const SKIRT_TAGS = new Set(['dress', 'column', 'long', 'ruffle', 'slip', 'shirtdress', 'skirt', 'pleat'])

export function initialSession(gender: Gender = 'female'): Session {
  return { gender, outfit: emptyOutfit(), past: [] }
}

export function localInterpret(text: string, session: Session, rng: () => number = Math.random): Turn {
  const parsed = parseUtterance(text, { gender: session.gender, focus: session.focus })
  return applyParsed(parsed, session, rng)
}

export function applyParsed(parsed: Parsed, session: Session, rng: () => number = Math.random): Turn {
  switch (parsed.intent) {
    case 'undo':
      return undo(session)
    case 'save':
      return save(session)
    case 'switch-gender':
      return switchGender(parsed, session)
    case 'random':
      return recommendRandom(session, rng)
    case 'remove':
      return remove(parsed, session)
    case 'add':
      return add(parsed, session)
    case 'recolor':
      return recolor(parsed, session)
    case 'specify':
      return specify(parsed, session)
    case 'recommend':
      return recommend(parsed, session)
    default:
      return none(session, 'unknown', '这句我还没接住。可以试试「来套通勤」「换白色」或「加件外套」。')
  }
}

export function toggleGarment(session: Session, id: string): Turn {
  const garment = garmentById(session.gender, id)
  if (!garment) {
    return none(session, 'unknown', '衣橱里没有这件。')
  }
  const current = session.outfit.slots[garment.slot]
  if (current?.id === id) {
    const outfit = cloneOutfit(session.outfit)
    delete outfit.slots[garment.slot]
    const next = commit(session, outfit, session.focus === garment.slot ? heroOf(outfit) : session.focus, session.lastStyle)
    return {
      intent: 'remove',
      reply: `${garment.name}脱掉了。`,
      session: next,
      action: 'apply',
    }
  }
  return place(session, garment, garment.defaultColor, false, `${colorName(garment.defaultColor)}${garment.name}穿上了。`)
}

function none(session: Session, intent: Intent, reply: string, suggestions = SUGGESTIONS): Turn {
  return { intent, reply, session, action: 'none', suggestions }
}

function finish(session: Session, intent: Intent, reply: string, action: TurnAction = 'apply'): Turn {
  return { intent, reply, session, action }
}

function undo(session: Session): Turn {
  if (session.past.length === 0) {
    return none(session, 'undo', '还没有可以退回的搭配。')
  }
  const prev = session.past[session.past.length - 1]
  return finish(
    {
      gender: prev.gender,
      outfit: cloneOutfit(prev.outfit),
      focus: prev.focus,
      lastStyle: prev.lastStyle,
      past: session.past.slice(0, -1),
    },
    'undo',
    '好，回到刚才那套。',
  )
}

function save(session: Session): Turn {
  if (!hasClothes(session.outfit)) {
    return none(session, 'save', '还是空的，先搭一套再保存。')
  }
  return finish(session, 'save', '存好了，在「我的搭配」里。', 'save')
}

function switchGender(parsed: Parsed, session: Session): Turn {
  const gender = parsed.gender ?? session.gender
  if (!parsed.style && gender === session.gender) {
    const name = gender === 'female' ? '女装' : '男装'
    return none(session, 'switch-gender', `现在就是${name}。`)
  }
  let next: Session = {
    gender,
    outfit: emptyOutfit(),
    focus: undefined,
    lastStyle: undefined,
    past: [...session.past, frameOf(session)].slice(-20),
  }
  if (!parsed.style) {
    const name = gender === 'female' ? '女装' : '男装'
    return {
      intent: 'switch-gender',
      reply: `换成${name}了。想试商务，还是休闲？`,
      session: next,
      action: 'switch-gender',
      suggestions: gender === 'male' ? ['来套商务的', '来套休闲'] : ['来套通勤', '给我搭套裙子'],
    }
  }
  next = {
    ...next,
    past: session.past,
  }
  // 换装同时点了场合：在新性别上直接搭。
  const switched: Session = {
    gender,
    outfit: emptyOutfit(),
    past: [...session.past, frameOf(session)].slice(-20),
  }
  const styled = recommend({ ...parsed, intent: 'recommend', gender: undefined }, switched)
  return { ...styled, action: 'switch-gender' }
}

function recommendRandom(session: Session, rng: () => number): Turn {
  const index = Math.min(STYLE_ORDER.length - 1, Math.floor(rng() * STYLE_ORDER.length))
  const style = STYLE_ORDER[index]
  return recommend({ intent: 'recommend', style, suggestions: SUGGESTIONS }, session)
}

function recommend(parsed: Parsed, session: Session): Turn {
  if (isSkirtAsk(session.gender, parsed.tag)) {
    return none(session, 'recommend', '男装衣橱里没有裙子。要不要换成女装看看？', ['看看女装', '来套商务的'])
  }
  if (parsed.style) {
    const outfit = cloneOutfit(PRESETS[session.gender][parsed.style])
    const next = commit(session, outfit, heroOf(outfit), parsed.style)
    return finish(next, 'recommend', presetReply(session.gender, parsed.style))
  }
  if (parsed.tag === 'dress' || parsed.tag === 'column' || parsed.tag === 'long') {
    const outfit = dressLook()
    const next = commit(session, outfit, 'dress', undefined)
    return finish(next, 'recommend', '黑色长裙，干净利落。')
  }
  if (parsed.tag) {
    const garment = findByTag(session.gender, parsed.tag)
    if (!garment) return missing(session, parsed.tag)
    const color = parsed.color ?? garment.defaultColor
    const cleared = commit(session, emptyOutfit(), undefined, undefined)
    return place(cleared, garment, color, true, `${colorName(color)}${garment.name}，先这么穿。`, false)
  }
  return none(session, 'recommend', '想搭哪种？通勤、休闲、约会、运动，或者说一件具体的衣服。')
}

function specify(parsed: Parsed, session: Session): Turn {
  if (!parsed.tag) return none(session, 'specify', '想穿哪一件？可以说「来条牛仔裤」或「来件衬衫」。')
  if (isSkirtAsk(session.gender, parsed.tag)) {
    return none(session, 'specify', '男装衣橱里没有裙子。要不要换成女装看看？', ['看看女装', '来套商务的'])
  }
  const garment = findByTag(session.gender, parsed.tag)
  if (!garment) return missing(session, parsed.tag)
  const color = parsed.color ?? garment.defaultColor
  return place(session, garment, color, true, `${colorName(color)}${garment.name}换上了。`)
}

function add(parsed: Parsed, session: Session): Turn {
  if (!parsed.tag) {
    return none(session, 'add', '想加哪一件？可以说「加件外套」「加件夹克」或「戴顶帽子」。')
  }
  if (isSkirtAsk(session.gender, parsed.tag)) {
    return none(session, 'add', '裙子没法叠在男装上。要不要换成女装？', ['看看女装'])
  }
  const garment = findByTag(session.gender, parsed.tag)
  if (!garment) return missing(session, parsed.tag)
  const color = parsed.color ?? garment.defaultColor
  const kept = hasClothes(session.outfit)
  const reply = addReply(garment, color, kept, session)
  return place(session, garment, color, true, reply)
}

function remove(parsed: Parsed, session: Session): Turn {
  const slot = removeSlotFor(parsed.tag, session)
  if (!slot) {
    return none(session, 'remove', parsed.tag ? '现在没穿着这件。' : '想脱掉哪一件？可以说「把外套脱了」或「不要帽子」。')
  }
  const garment = garmentById(session.gender, session.outfit.slots[slot]!.id)
  const outfit = cloneOutfit(session.outfit)
  delete outfit.slots[slot]
  const next = commit(session, outfit, heroOf(outfit), session.lastStyle)
  return finish(next, 'remove', `${garment?.name ?? '这件'}脱掉了。`)
}

function recolor(parsed: Parsed, session: Session): Turn {
  const color = parsed.color
  if (!color) return none(session, 'recolor', '想换成哪种颜色？比如白、黑、藏青、米。')

  if (parsed.tag) {
    if (isSkirtAsk(session.gender, parsed.tag)) {
      return none(session, 'recolor', '男装衣橱里没有裙子。要不要换成女装看看？', ['看看女装'])
    }
    const garment = findByTag(session.gender, parsed.tag)
    const slot = garment?.slot ?? TAG_SLOT[parsed.tag]
    if (!slot || !garment) return missing(session, parsed.tag)
    const current = session.outfit.slots[slot]
    const currentGarment = current ? garmentById(session.gender, current.id) : undefined
    const sameFamily =
      currentGarment &&
      (currentGarment.id === garment.id ||
        currentGarment.primary === parsed.tag ||
        currentGarment.tags.includes(parsed.tag))
    if (current && sameFamily) return paint(session, [slot], color)
    return place(session, garment, color, true, `${colorName(color)}${garment.name}换上了。`)
  }

  if ((parsed.target === 'dress' || session.focus === 'dress') && session.outfit.slots.dress) {
    return paint(session, ['dress'], color)
  }
  if (isSuit(session)) return paint(session, ['outer', 'bottom'], color)
  if (session.focus && session.outfit.slots[session.focus]) return paint(session, [session.focus], color)
  const fallback = heroOf(session.outfit)
  if (fallback) return paint(session, [fallback], color)
  return none(session, 'recolor', '还没穿上衣服。先说「来套通勤」或「给我搭套裙子」。')
}

function paint(session: Session, slots: Slot[], color: ColorId): Turn {
  const outfit = cloneOutfit(session.outfit)
  let swappedToRuffle = false
  for (const slot of slots) {
    const current = outfit.slots[slot]
    if (!current) continue
    const garment = garmentById(session.gender, current.id)
    const nextId = garment?.colorways?.[color] ?? current.id
    if (nextId === 'dress-ruffle' && current.id !== 'dress-ruffle') swappedToRuffle = true
    outfit.slots[slot] = { id: nextId, color }
  }
  const focus = slots[0]
  const next = commit(session, outfit, focus, session.lastStyle)
  return finish(next, 'recolor', paintReply(session, next, slots, color, swappedToRuffle))
}

function place(
  session: Session,
  garment: Garment,
  color: ColorId,
  fillGaps: boolean,
  reply: string,
  keepHistoryFrom: boolean = true,
): Turn {
  const outfit = cloneOutfit(session.outfit)
  if (garment.slot === 'dress') {
    delete outfit.slots.top
    delete outfit.slots.bottom
  }
  if (garment.slot === 'top' || garment.slot === 'bottom') {
    delete outfit.slots.dress
  }
  outfit.slots[garment.slot] = { id: garment.id, color }
  if (fillGaps) fillSupport(session.gender, outfit)
  const base = keepHistoryFrom ? session : { ...session, past: session.past }
  const next = commit(base, outfit, garment.slot, base.lastStyle)
  return finish(next, 'specify', reply)
}

function fillSupport(gender: Gender, outfit: Outfit): void {
  if (outfit.slots.dress) {
    if (!outfit.slots.shoes) {
      outfit.slots.shoes =
        gender === 'female' ? { id: 'shoes-heel', color: 'black' } : { id: 'shoes-loafer', color: 'brown' }
    }
    return
  }
  const dressed = outfit.slots.top || outfit.slots.bottom || outfit.slots.outer || outfit.slots.coat
  if (!dressed) return
  if (!outfit.slots.bottom) {
    outfit.slots.bottom =
      gender === 'female' ? { id: 'bottom-trouser', color: 'beige' } : { id: 'bottom-chinos', color: 'khaki' }
  }
  if (!outfit.slots.top) {
    outfit.slots.top = { id: 'top-tee', color: 'white' }
  }
}

function paintReply(
  before: Session,
  after: Session,
  slots: Slot[],
  color: ColorId,
  swappedToRuffle: boolean,
): string {
  if (swappedToRuffle && color === 'white') return '换成白色荷叶边裙了，轻一点。'
  const suit =
    slots.includes('outer') &&
    slots.includes('bottom') &&
    after.outfit.slots.top?.color === 'white' &&
    before.outfit.slots.top?.id === 'top-shirt'
  if (suit && color === 'navy') return '西装和西裤换成藏青色了，衬衫还是白的。'
  if (slots.length > 1) {
    const names = slots
      .map((slot) => garmentById(after.gender, after.outfit.slots[slot]?.id ?? '')?.name)
      .filter(Boolean)
    return `${names.join('和')}换成${colorName(color)}了。`
  }
  const slot = slots[0]
  const name = garmentById(after.gender, after.outfit.slots[slot]?.id ?? '')?.name ?? '这件'
  return `${name}换成${colorName(color)}了。`
}

function addReply(garment: Garment, color: ColorId, kept: boolean, session: Session): string {
  if (garment.id === 'outer-leather' && color === 'black' && kept) return '黑皮夹克叠上，里面还是那套。'
  if (garment.slot === 'coat' && session.outfit.slots.outer && kept) {
    return `${colorName(color)}大衣加上了，西装还在里面。`
  }
  if (kept) return `${colorName(color)}${garment.name}叠上了，别的没动。`
  return `${colorName(color)}${garment.name}先穿上了。`
}

function presetReply(gender: Gender, style: Style): string {
  if (gender === 'female' && style === 'casual') return '白短上衣配米色长裤，加上腰带和运动鞋。'
  if (gender === 'female' && style === 'commute') return '白衬衫配黑西裤，外面一件西装，去上班刚好。'
  if (gender === 'female' && style === 'date') return '酒红吊带裙，配高跟鞋，适合晚上。'
  if (gender === 'female' && style === 'sport') return '卫衣和运动裤，脚上是运动鞋。'
  if (gender === 'female' && style === 'formal') return '衬衫、西裤和西装，正式一点。'
  if (gender === 'female' && style === 'business') return '奶油色衬衫配藏青西装，利落。'
  if (gender === 'female' && style === 'resort') return '丝质衬衫、短裤和凉鞋，再戴顶草帽。'
  if (gender === 'female' && style === 'winter') return '高领毛衣、驼色大衣和围巾，风会小一点。'
  if (gender === 'female' && style === 'summer') return '白T恤配半裙，凉鞋就好。'
  if (gender === 'female' && style === 'newchinese') return '立领上衣配阔腿裤，安静的那种。'
  if (gender === 'male' && style === 'business') return '白衬衫配黑西装，正式但不僵。'
  if (gender === 'male' && style === 'commute') return '衬衫、卡其裤和西装，日常通勤。'
  if (gender === 'male' && style === 'casual') return '白T恤配卡其裤，脚上运动鞋。'
  if (gender === 'male' && style === 'date') return '黑色针织衫和西裤，干净。'
  if (gender === 'male' && style === 'sport') return '卫衣、运动裤、运动鞋。'
  if (gender === 'male' && style === 'formal') return '藏青西装打上领带，郑重一点。'
  if (gender === 'male' && style === 'resort') return '亚麻衬衫和短裤，轻松出门。'
  if (gender === 'male' && style === 'winter') return '高领、驼色大衣和围巾。'
  if (gender === 'male' && style === 'summer') return '蓝T恤和短裤，热天这么穿。'
  if (gender === 'male' && style === 'newchinese') return '黑色立领配西裤，收着来。'
  return '这套可以。'
}

function removeSlotFor(tag: string | undefined, session: Session): Slot | undefined {
  if (!tag) {
    if (session.outfit.slots.coat) return 'coat'
    if (session.outfit.slots.outer) return 'outer'
    if (session.outfit.slots.hat) return 'hat'
    if (session.outfit.slots.neck) return 'neck'
    return undefined
  }
  if ((tag === 'outer' || tag === 'jacket') && session.outfit.slots.coat && !session.outfit.slots.outer) {
    return 'coat'
  }
  if (tag === 'outer' && session.outfit.slots.coat) return 'coat'
  const garment = findByTag(session.gender, tag)
  const slot = garment?.slot ?? TAG_SLOT[tag]
  if (!slot || !session.outfit.slots[slot]) {
    if (tag === 'outer' && session.outfit.slots.coat) return 'coat'
    return undefined
  }
  return slot
}

function isSuit(session: Session): boolean {
  const outer = session.outfit.slots.outer
  const bottom = session.outfit.slots.bottom
  if (!outer || !bottom) return false
  const outerG = garmentById(session.gender, outer.id)
  const bottomG = garmentById(session.gender, bottom.id)
  return Boolean(outerG?.tags.includes('blazer') && bottomG?.tags.includes('suit-bottom'))
}

function isSkirtAsk(gender: Gender, tag?: string): boolean {
  return gender === 'male' && Boolean(tag && SKIRT_TAGS.has(tag))
}

function missing(session: Session, tag: string): Turn {
  if (tag === 'heel' && session.gender === 'male') {
    return none(session, 'specify', '男装没有高跟鞋。可以试试牛津鞋或乐福鞋。', ['来双牛津鞋', '来套商务的'])
  }
  return none(session, 'unknown', '这件我还没放进衣橱。可以换个说法，比如「来件衬衫」或「加件外套」。')
}

function hasClothes(outfit: Outfit): boolean {
  return Object.keys(outfit.slots).length > 0
}

function heroOf(outfit: Outfit): Slot | undefined {
  if (outfit.slots.dress) return 'dress'
  if (outfit.slots.outer) return 'outer'
  if (outfit.slots.coat) return 'coat'
  if (outfit.slots.top) return 'top'
  if (outfit.slots.bottom) return 'bottom'
  return undefined
}

function frameOf(session: Session): SessionFrame {
  return {
    gender: session.gender,
    outfit: cloneOutfit(session.outfit),
    focus: session.focus,
    lastStyle: session.lastStyle,
  }
}

function commit(session: Session, outfit: Outfit, focus: Slot | undefined, lastStyle: Style | undefined): Session {
  const changed = JSON.stringify(session.outfit.slots) !== JSON.stringify(outfit.slots)
  return {
    gender: session.gender,
    outfit,
    focus,
    lastStyle,
    past: changed ? [...session.past, frameOf(session)].slice(-20) : session.past,
  }
}
