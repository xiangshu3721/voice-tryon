import { describe, expect, it } from 'vitest'
import { interpretMirror, parseMirror, searchGarments } from './search'
import { initialMirror, layers, toggle, wear } from './session'
import { garmentOf, garmentsOf, STYLES, WARDROBE } from './wardrobe'

const female = () => initialMirror('female')
const male = () => initialMirror('male')

describe('衣库', () => {
  it('每个性别至少 15 件，且字段完整', () => {
    for (const g of ['female', 'male'] as const) {
      const items = garmentsOf(g)
      expect(items.length).toBeGreaterThanOrEqual(15)
      for (const it of items) {
        expect(it.image).toMatch(/^garments\/.+\.webp$/)
        expect(it.anchors.hipL.x).toBeGreaterThanOrEqual(0)
        expect(it.anchors.hipR.x).toBeLessThanOrEqual(1)
        if (it.category !== 'bottom') {
          expect(it.anchors.shoulderL).toBeDefined()
          expect(it.anchors.shoulderL!.x).toBeLessThan(it.anchors.shoulderR!.x)
          expect(it.anchors.shoulderL!.y).toBeLessThan(it.anchors.hipL.y)
        } else {
          expect(it.anchors.waistL!.x).toBeLessThan(it.anchors.waistR!.x)
          expect(it.anchors.waistL!.y).toBeLessThan(it.anchors.hem.y)
        }
      }
      expect(STYLES[g].length).toBeGreaterThanOrEqual(5)
    }
    expect(new Set(WARDROBE.map((g) => g.id)).size).toBe(WARDROBE.length)
  })
})

describe('镜子指令解析', () => {
  it('换件老钱风的外套 → 老钱风外套', () => {
    const t = interpretMirror('换件老钱风的外套', female())
    expect(t.intent).toBe('wear')
    const g = garmentOf(t.session.worn.outer!)!
    expect(g.style).toBe('oldmoney')
    expect(g.category).toBe('outer')
  })

  it('来条黑色阔腿裤 → 黑色阔腿裤', () => {
    const t = interpretMirror('来条黑色阔腿裤', female())
    const g = garmentOf(t.session.worn.bottom!)!
    expect(g.color).toBe('black')
    expect(g.keywords).toContain('阔腿裤')
  })

  it('试试新中式 → 一整套新中式', () => {
    const t = interpretMirror('试试新中式', female())
    expect(t.intent).toBe('look')
    const items = layers(t.session.worn)
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(items.every((g) => g.style === 'newchinese')).toBe(true)
  })

  it('男装也能搜：来套户外的 / 换件美拉德夹克', () => {
    const a = interpretMirror('来套户外的', male())
    expect(layers(a.session.worn).every((g) => g.style === 'outdoor')).toBe(true)
    const b = interpretMirror('换件美拉德夹克', male())
    expect(garmentOf(b.session.worn.outer!)!.style).toBe('maillard')
  })

  it('换男装 / 换女装', () => {
    expect(parseMirror('换男装', 'female')).toMatchObject({ intent: 'gender', gender: 'male' })
    const t = interpretMirror('看看女装', male())
    expect(t.session.gender).toBe('female')
    expect(t.session.worn).toEqual({})
  })

  it('脱掉外套、撤销', () => {
    let s = interpretMirror('试试新中式', female()).session
    expect(s.worn.outer).toBeDefined()
    s = interpretMirror('脱掉外套', s).session
    expect(s.worn.outer).toBeUndefined()
    s = interpretMirror('撤销', s).session
    expect(s.worn.outer).toBeDefined()
  })

  it('拍照只返回动作，不改穿搭', () => {
    const s = female()
    const t = interpretMirror('拍一张', s)
    expect(t.effect).toBe('photo')
    expect(t.session).toBe(s)
  })

  it('连衣裙和上衣下装互斥', () => {
    let s = interpretMirror('来套老钱风', female()).session
    expect(s.worn.top && s.worn.bottom).toBeTruthy()
    s = interpretMirror('来件连衣裙', s).session
    expect(s.worn.dress).toBeDefined()
    expect(s.worn.top).toBeUndefined()
    expect(s.worn.bottom).toBeUndefined()
  })

  it('点衣柜：再点一下脱掉', () => {
    const id = garmentsOf('female')[0].id
    let s = toggle(female(), id)
    expect(Object.values(s.worn)).toContain(id)
    s = toggle(s, id)
    expect(Object.values(s.worn)).not.toContain(id)
  })

  it('换一件：同类下一件', () => {
    let s = interpretMirror('换件外套', female()).session
    const first = s.worn.outer
    s = interpretMirror('换一件', s).session
    expect(s.worn.outer).toBeDefined()
    expect(s.worn.outer).not.toBe(first)
  })

  it('搜不到时不乱换', () => {
    const t = interpretMirror('今天天气不错', female())
    expect(t.intent).toBe('unknown')
    expect(t.session.worn).toEqual({})
  })

  it('搜索：颜色加分', () => {
    const r = searchGarments('female', { intent: 'wear', category: 'top', color: 'white' })
    expect(r[0].color).toBe('white')
  })

  it('不会穿到别的性别的衣服', () => {
    const femaleId = garmentsOf('female')[0].id
    const s = wear(male(), femaleId)
    expect(s.worn).toEqual({})
  })
})
