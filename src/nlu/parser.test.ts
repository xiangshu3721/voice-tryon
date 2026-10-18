import { describe, expect, it } from 'vitest'
import { matchColor } from '../palette'
import { parseUtterance, type ParseContext } from './parser'

const female: ParseContext = { gender: 'female' }
const male: ParseContext = { gender: 'male' }

describe('颜色词', () => {
  it('藏青色不会被当成蓝色', () => {
    expect(matchColor('换成藏青色')?.color).toBe('navy')
    expect(matchColor('换成蓝色')?.color).toBe('blue')
    expect(matchColor('白色的呢')?.color).toBe('white')
  })
})

describe('女装五步对话', () => {
  it('给我搭套裙子', () => {
    expect(parseUtterance('给我搭套裙子', female)).toMatchObject({
      intent: 'recommend',
      tag: 'dress',
    })
  })

  it('白色的呢：只改颜色，并记住上一句是裙子', () => {
    expect(parseUtterance('白色的呢', { ...female, focus: 'dress' })).toMatchObject({
      intent: 'recolor',
      color: 'white',
      target: 'dress',
    })
  })

  it('还是给我来点休闲的', () => {
    expect(parseUtterance('还是给我来点休闲的', { ...female, focus: 'dress' })).toMatchObject({
      intent: 'recommend',
      style: 'casual',
    })
  })

  it('加一件夹克：叠加，不是整套重搭', () => {
    expect(parseUtterance('加一件夹克', female)).toMatchObject({
      intent: 'add',
      tag: 'jacket',
    })
  })

  it('好，帮我保存这套', () => {
    expect(parseUtterance('好，帮我保存这套', female)).toMatchObject({ intent: 'save' })
  })
})

describe('男装场景', () => {
  it('来套商务的', () => {
    expect(parseUtterance('来套商务的', male)).toMatchObject({
      intent: 'recommend',
      style: 'business',
    })
  })

  it('换成藏青色', () => {
    expect(parseUtterance('换成藏青色', { ...male, focus: 'outer' })).toMatchObject({
      intent: 'recolor',
      color: 'navy',
    })
  })

  it('加件大衣', () => {
    expect(parseUtterance('加件大衣', male)).toMatchObject({
      intent: 'add',
      tag: 'coat',
    })
  })
})

describe('其他说法', () => {
  it('指定单品、改颜色、脱掉、撤销、随机、换性别', () => {
    expect(parseUtterance('来条牛仔裤', female)).toMatchObject({ intent: 'specify', tag: 'jeans' })
    expect(parseUtterance('来件白色短上衣', female)).toMatchObject({
      intent: 'specify',
      tag: 'crop',
      color: 'white',
    })
    expect(parseUtterance('上衣换红色', female)).toMatchObject({
      intent: 'recolor',
      tag: 'top',
      color: 'red',
    })
    expect(parseUtterance('换成蓝的', female)).toMatchObject({ intent: 'recolor', color: 'blue' })
    expect(parseUtterance('换白色', female)).toMatchObject({ intent: 'recolor', color: 'white' })
    expect(parseUtterance('把外套脱了', female)).toMatchObject({ intent: 'remove', tag: 'outer' })
    expect(parseUtterance('不要帽子', female)).toMatchObject({ intent: 'remove', tag: 'hat' })
    expect(parseUtterance('戴顶帽子', female)).toMatchObject({ intent: 'add', tag: 'hat' })
    expect(parseUtterance('还是刚才那套', female)).toMatchObject({ intent: 'undo' })
    expect(parseUtterance('随便来一套', female)).toMatchObject({ intent: 'random' })
    expect(parseUtterance('换男装', female)).toMatchObject({ intent: 'switch-gender', gender: 'male' })
    expect(parseUtterance('看看女装', male)).toMatchObject({ intent: 'switch-gender', gender: 'female' })
  })

  it('场合', () => {
    expect(parseUtterance('来套通勤', female).style).toBe('commute')
    expect(parseUtterance('约会穿什么', female).style).toBe('date')
    expect(parseUtterance('冬天怎么穿', female).style).toBe('winter')
    expect(parseUtterance('夏天穿什么', male).style).toBe('summer')
    expect(parseUtterance('来套新中式', female).style).toBe('newchinese')
    expect(parseUtterance('运动一下', female).style).toBe('sport')
    expect(parseUtterance('正式一点', male).style).toBe('formal')
    expect(parseUtterance('度假穿什么', female).style).toBe('resort')
  })

  it('听不懂时给建议', () => {
    const parsed = parseUtterance('今天天气真好', female)
    expect(parsed.intent).toBe('unknown')
    expect(parsed.suggestions.join('')).toMatch(/通勤/)
  })

  it('来条运动裤是运动裤，不是整套运动look', () => {
    expect(parseUtterance('来条运动裤', male)).toMatchObject({ intent: 'specify', tag: 'jogger' })
  })
})
