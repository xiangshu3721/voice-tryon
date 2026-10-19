import type { ColorId, Gender } from '../types'
import type { Anchors, Category, Length } from './fit'
import data from './wardrobe.json'

export interface StyleInfo {
  id: string
  name: string
  aliases: string[]
  /** 判断它流行的依据（白皮书 / 平台专题），只做说明 */
  source: string
}

export interface PhotoGarment {
  id: string
  name: string
  gender: Gender
  style: string
  category: Category
  color: ColorId
  colorName: string
  length: Length
  keywords: string[]
  /** 相对 public/ 的路径 */
  image: string
  size: { w: number; h: number }
  anchors: Anchors
}

interface WardrobeFile {
  version: number
  styles: Record<Gender, StyleInfo[]>
  items: PhotoGarment[]
}

const file = data as unknown as WardrobeFile

export const WARDROBE: PhotoGarment[] = file.items
export const STYLES: Record<Gender, StyleInfo[]> = file.styles

export const CATEGORY_LABEL: Record<Category, string> = {
  top: '上衣',
  outer: '外套',
  bottom: '下装',
  dress: '连衣裙',
}

/** 衣柜分栏顺序 */
export const CATEGORY_ORDER: Category[] = ['outer', 'top', 'bottom', 'dress']

/** 叠穿顺序：下装 < 上衣 / 连衣裙 < 外套 */
export const LAYER_ORDER: Category[] = ['bottom', 'dress', 'top', 'outer']

export function garmentsOf(gender: Gender): PhotoGarment[] {
  return WARDROBE.filter((g) => g.gender === gender)
}

export function garmentOf(id: string): PhotoGarment | undefined {
  return WARDROBE.find((g) => g.id === id)
}

export function styleOf(gender: Gender, id: string): StyleInfo | undefined {
  return STYLES[gender].find((s) => s.id === id)
}

export function imageUrl(g: PhotoGarment): string {
  return `${import.meta.env.BASE_URL ?? '/'}${g.image}`
}
