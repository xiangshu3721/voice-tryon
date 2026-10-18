import { describe, expect, it } from 'vitest'
import { CATALOG } from '../wardrobe/catalog'
import { PRESETS, STYLE_ORDER } from '../wardrobe/presets'
import { garmentById } from '../wardrobe/catalog'
import { initialSession, localInterpret, toggleGarment, type Session } from './apply'
import { createIntentProvider, outfitFromUnknown, resolveProviderKind, turnFromGateway } from './providers'

function run(lines: string[], gender: 'female' | 'male' = 'female'): Session {
  let session = initialSession(gender)
  for (const line of lines) {
    session = localInterpret(line, session).session
  }
  return session
}

describe('衣橱', () => {
  it('男女各自至少 30 件，并且都能画', async () => {
    const { DRAWS } = await import('../render/specs')
    for (const gender of ['female', 'male'] as const) {
      const items = CATALOG.filter((item) => item.gender === gender)
      expect(items.length).toBeGreaterThanOrEqual(30)
      const primaries = items.map((item) => item.primary)
      expect(new Set(primaries).size).toBe(primaries.length)
      for (const item of items) expect(DRAWS[item.id], item.id).toBeTruthy()
    }
  })

  it('预设里的单品都在衣橱里', () => {
    for (const gender of ['female', 'male'] as const) {
      for (const style of STYLE_ORDER) {
        for (const worn of Object.values(PRESETS[gender][style].slots)) {
          if (!worn) continue
          expect(garmentById(gender, worn.id), `${gender} ${style} ${worn.id}`).toBeTruthy()
        }
      }
    }
  })
})

describe('女装五步会穿到对的衣服', () => {
  it('裙子 → 白色荷叶边 → 休闲 → 叠皮夹克 → 保存', () => {
    let session = initialSession('female')

    let turn = localInterpret('给我搭套裙子', session)
    expect(turn.reply).toMatch(/长裙/)
    expect(turn.session.outfit.slots.dress).toEqual({ id: 'dress-column', color: 'black' })
    expect(turn.session.outfit.slots.shoes?.id).toBe('shoes-heel')
    expect(turn.session.focus).toBe('dress')
    session = turn.session

    turn = localInterpret('白色的呢', session)
    expect(turn.intent).toBe('recolor')
    expect(turn.session.outfit.slots.dress).toEqual({ id: 'dress-ruffle', color: 'white' })
    expect(turn.session.outfit.slots.shoes?.id).toBe('shoes-heel')
    expect(turn.reply).toMatch(/荷叶边/)
    session = turn.session

    turn = localInterpret('还是给我来点休闲的', session)
    expect(turn.session.outfit.slots.dress).toBeUndefined()
    expect(turn.session.outfit.slots.top).toEqual({ id: 'top-crop', color: 'white' })
    expect(turn.session.outfit.slots.bottom).toEqual({ id: 'bottom-trouser', color: 'beige' })
    expect(turn.session.outfit.slots.belt?.id).toBe('belt-slim')
    expect(turn.session.outfit.slots.shoes).toEqual({ id: 'shoes-sneaker', color: 'white' })
    expect(turn.reply).toMatch(/腰带/)
    session = turn.session

    const before = session.outfit.slots.top
    turn = localInterpret('加一件夹克', session)
    expect(turn.session.outfit.slots.outer).toEqual({ id: 'outer-leather', color: 'black' })
    expect(turn.session.outfit.slots.top).toEqual(before)
    expect(turn.session.outfit.slots.bottom?.id).toBe('bottom-trouser')
    expect(turn.session.outfit.slots.belt?.id).toBe('belt-slim')
    expect(turn.reply).toMatch(/夹克/)
    session = turn.session

    turn = localInterpret('好，帮我保存这套', session)
    expect(turn.action).toBe('save')
    expect(turn.session.outfit.slots.outer?.id).toBe('outer-leather')
    expect(turn.reply).toMatch(/存好了/)
  })
})

describe('男装三步', () => {
  it('商务 → 藏青 → 大衣叠在西装外', () => {
    let session = initialSession('male')
    let turn = localInterpret('来套商务的', session)
    expect(turn.session.outfit.slots.top).toEqual({ id: 'top-shirt', color: 'white' })
    expect(turn.session.outfit.slots.bottom).toEqual({ id: 'bottom-trouser', color: 'black' })
    expect(turn.session.outfit.slots.outer).toEqual({ id: 'outer-blazer', color: 'black' })
    expect(turn.session.outfit.slots.shoes?.id).toBe('shoes-oxford')
    session = turn.session

    turn = localInterpret('换成藏青色', session)
    expect(turn.session.outfit.slots.outer?.color).toBe('navy')
    expect(turn.session.outfit.slots.bottom?.color).toBe('navy')
    expect(turn.session.outfit.slots.top).toEqual({ id: 'top-shirt', color: 'white' })
    expect(turn.reply).toMatch(/藏青/)
    session = turn.session

    turn = localInterpret('加件大衣', session)
    expect(turn.session.outfit.slots.coat?.id).toBe('coat-wool')
    expect(turn.session.outfit.slots.outer?.id).toBe('outer-blazer')
    expect(turn.session.outfit.slots.outer?.color).toBe('navy')
    expect(turn.session.outfit.slots.top?.color).toBe('white')
  })
})

describe('搭配动作', () => {
  it('撤销回到上一套', () => {
    const session = run(['给我搭套裙子', '还是给我来点休闲的', '还是刚才那套'])
    expect(session.outfit.slots.dress?.id).toBe('dress-column')
    expect(session.outfit.slots.top).toBeUndefined()
  })

  it('脱掉外套、不要帽子、点衣橱可以穿脱', () => {
    let session = run(['来套休闲', '加一件夹克', '戴顶帽子'])
    expect(session.outfit.slots.hat?.id).toBe('hat-beret')
    session = localInterpret('不要帽子', session).session
    expect(session.outfit.slots.hat).toBeUndefined()
    session = localInterpret('把外套脱了', session).session
    expect(session.outfit.slots.outer).toBeUndefined()
    expect(session.outfit.slots.top?.id).toBe('top-crop')

    let turn = toggleGarment(session, 'bottom-jeans')
    expect(turn.session.outfit.slots.bottom?.id).toBe('bottom-jeans')
    expect(turn.session.outfit.slots.dress).toBeUndefined()
    turn = toggleGarment(turn.session, 'bottom-jeans')
    expect(turn.session.outfit.slots.bottom).toBeUndefined()

    const clicked = toggleGarment(initialSession(), 'top-crop')
    expect(clicked.session.outfit.slots.top?.id).toBe('top-crop')
    expect(clicked.session.outfit.slots.bottom).toBeUndefined()
  })

  it('空衣柜时换颜色、保存、撤销都有人话', () => {
    const session = initialSession()
    expect(localInterpret('换白色', session).reply).toMatch(/还没穿/)
    expect(localInterpret('保存这套', session).action).toBe('none')
    expect(localInterpret('还是刚才那套', session).reply).toMatch(/没有/)
  })

  it('男装要裙子时建议换女装', () => {
    const turn = localInterpret('给我搭套裙子', initialSession('male'))
    expect(turn.action).toBe('none')
    expect(turn.reply).toMatch(/女装/)
  })

  it('换性别', () => {
    const turn = localInterpret('换男装', initialSession('female'))
    expect(turn.action).toBe('switch-gender')
    expect(turn.session.gender).toBe('male')
    expect(turn.session.outfit.slots.top).toBeUndefined()
  })

  it('随机一套是稳定可测的', () => {
    const turn = localInterpret('随便来一套', initialSession('female'), () => 0)
    expect(turn.session.outfit.slots.top || turn.session.outfit.slots.dress).toBeTruthy()
    expect(turn.session.lastStyle).toBe(STYLE_ORDER[0])
  })
})

describe('IntentProvider', () => {
  it('没配置接口就用本地规则', () => {
    expect(resolveProviderKind(undefined)).toBe('local')
    expect(resolveProviderKind('  ')).toBe('local')
    expect(resolveProviderKind('https://example.com/api/stylist')).toBe('gateway')
    expect(createIntentProvider(undefined).id).toBe('local-rules')
  })

  it('网关返回不了合法搭配时退回本地', async () => {
    const provider = createIntentProvider('https://stylist.example/api/stylist', async () => {
      throw new Error('offline')
    })
    const turn = await provider.interpret('给我搭套裙子', initialSession('female'))
    expect(turn.session.outfit.slots.dress?.id).toBe('dress-column')
  })

  it('合法的网关结果会采用，非法单品会丢掉', () => {
    const session = initialSession('female')
    const ok = turnFromGateway(session, {
      reply: '网关搭的。',
      action: 'apply',
      intent: 'recommend',
      outfit: { slots: { dress: { id: 'dress-slip', color: 'red' } } },
    })
    expect(ok?.session.outfit.slots.dress).toEqual({ id: 'dress-slip', color: 'red' })
    expect(ok?.reply).toBe('网关搭的。')

    expect(
      turnFromGateway(session, {
        reply: '不行',
        action: 'apply',
        outfit: { slots: { dress: { id: 'nope', color: 'red' } } },
      }),
    ).toBeNull()

    expect(outfitFromUnknown('female', { slots: { top: { id: 'top-tee', color: 'nope' } } })).toBeNull()
  })
})
