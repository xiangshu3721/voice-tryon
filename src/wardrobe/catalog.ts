import type { ColorId, Gender, Slot } from '../types'

export interface Garment {
  id: string
  gender: Gender
  slot: Slot
  name: string
  primary: string
  tags: string[]
  defaultColor: ColorId
  colorways?: Partial<Record<ColorId, string>>
}

function item(
  gender: Gender,
  id: string,
  slot: Slot,
  name: string,
  primary: string,
  tags: string[],
  defaultColor: ColorId,
  colorways?: Partial<Record<ColorId, string>>,
): Garment {
  return { id, gender, slot, name, primary, tags, defaultColor, colorways }
}

const female: Garment[] = [
  item('female', 'top-crop', 'top', '短上衣', 'crop', ['crop', 'tee', 'top'], 'white'),
  item('female', 'top-tee', 'top', '圆领T恤', 'tee', ['tee', 'top'], 'white'),
  item('female', 'top-shirt', 'top', '衬衫', 'shirt', ['shirt', 'top'], 'white'),
  item('female', 'top-cami', 'top', '吊带', 'cami', ['cami', 'top'], 'cream'),
  item('female', 'top-hoodie', 'top', '卫衣', 'hoodie', ['hoodie', 'top'], 'gray'),
  item('female', 'top-turtleneck', 'top', '高领毛衣', 'turtleneck', ['turtleneck', 'sweater', 'top'], 'cream'),
  item('female', 'top-silk', 'top', '丝质衬衫', 'silk', ['silk', 'shirt', 'top'], 'cream'),
  item('female', 'top-mandarin', 'top', '立领上衣', 'mandarin', ['mandarin', 'top'], 'cream'),
  item('female', 'outer-leather', 'outer', '皮夹克', 'jacket', ['jacket', 'leather'], 'black'),
  item('female', 'outer-blazer', 'outer', '西装外套', 'blazer', ['blazer', 'suit', 'outer'], 'black'),
  item('female', 'outer-denim', 'outer', '牛仔外套', 'denim', ['denim', 'jacket'], 'blue'),
  item('female', 'outer-cardigan', 'outer', '针织开衫', 'cardigan', ['cardigan', 'outer'], 'oat'),
  item('female', 'coat-wool', 'coat', '大衣', 'coat', ['coat', 'wool'], 'camel'),
  item('female', 'coat-trench', 'coat', '风衣', 'trench', ['trench', 'coat'], 'khaki'),
  item('female', 'bottom-jeans', 'bottom', '牛仔裤', 'jeans', ['jeans', 'pants', 'bottom'], 'blue'),
  item('female', 'bottom-trouser', 'bottom', '长裤', 'pants', ['pants', 'trouser', 'bottom'], 'beige'),
  item('female', 'bottom-tailored', 'bottom', '西裤', 'tailored', ['tailored', 'trouser', 'pants', 'bottom', 'suit-bottom'], 'black'),
  item('female', 'bottom-shorts', 'bottom', '短裤', 'shorts', ['shorts', 'bottom'], 'beige'),
  item('female', 'bottom-wide', 'bottom', '阔腿裤', 'wide', ['wide', 'pants', 'bottom'], 'black'),
  item('female', 'bottom-jogger', 'bottom', '运动裤', 'jogger', ['jogger', 'pants', 'bottom'], 'black'),
  item('female', 'bottom-pleat', 'bottom', '百褶裙', 'pleat', ['pleat', 'skirt', 'bottom'], 'oat'),
  item('female', 'bottom-midi', 'bottom', '半裙', 'skirt', ['skirt', 'midi', 'bottom'], 'black'),
  item('female', 'dress-column', 'dress', '长裙', 'column', ['column', 'dress', 'long'], 'black', {
    white: 'dress-ruffle',
  }),
  item('female', 'dress-ruffle', 'dress', '荷叶边裙', 'ruffle', ['ruffle', 'dress'], 'white'),
  item('female', 'dress-slip', 'dress', '吊带裙', 'slip', ['slip', 'dress'], 'burgundy'),
  item('female', 'dress-shirt', 'dress', '衬衫裙', 'shirtdress', ['shirtdress', 'dress'], 'white'),
  item('female', 'shoes-sneaker', 'shoes', '运动鞋', 'sneaker', ['sneaker', 'shoes'], 'white'),
  item('female', 'shoes-heel', 'shoes', '高跟鞋', 'heel', ['heel', 'shoes'], 'black'),
  item('female', 'shoes-loafer', 'shoes', '乐福鞋', 'loafer', ['loafer', 'shoes'], 'black'),
  item('female', 'shoes-boot', 'shoes', '短靴', 'boot', ['boot', 'shoes'], 'brown'),
  item('female', 'shoes-sandal', 'shoes', '凉鞋', 'sandal', ['sandal', 'shoes'], 'camel'),
  item('female', 'belt-slim', 'belt', '腰带', 'belt', ['belt'], 'brown'),
  item('female', 'hat-beret', 'hat', '贝雷帽', 'beret', ['beret', 'hat'], 'black'),
  item('female', 'hat-straw', 'hat', '草帽', 'straw', ['straw', 'hat'], 'oat'),
  item('female', 'neck-scarf', 'neck', '围巾', 'scarf', ['scarf', 'neck'], 'burgundy'),
  item('female', 'bag-tote', 'bag', '手提包', 'tote', ['tote', 'bag'], 'black'),
  item('female', 'glasses-frame', 'glasses', '眼镜', 'glasses', ['glasses'], 'brown'),
]

const male: Garment[] = [
  item('male', 'top-tee', 'top', 'T恤', 'tee', ['tee', 'top'], 'white'),
  item('male', 'top-shirt', 'top', '衬衫', 'shirt', ['shirt', 'top'], 'white'),
  item('male', 'top-polo', 'top', 'Polo衫', 'polo', ['polo', 'top'], 'navy'),
  item('male', 'top-hoodie', 'top', '卫衣', 'hoodie', ['hoodie', 'top'], 'gray'),
  item('male', 'top-turtleneck', 'top', '高领毛衣', 'turtleneck', ['turtleneck', 'sweater', 'top'], 'gray'),
  item('male', 'top-knit', 'top', '针织衫', 'knit', ['knit', 'top'], 'black'),
  item('male', 'top-mandarin', 'top', '立领上衣', 'mandarin', ['mandarin', 'top'], 'black'),
  item('male', 'top-linen', 'top', '亚麻衬衫', 'linen', ['linen', 'shirt', 'top'], 'white'),
  item('male', 'outer-leather', 'outer', '皮夹克', 'jacket', ['jacket', 'leather'], 'black'),
  item('male', 'outer-blazer', 'outer', '西装外套', 'blazer', ['blazer', 'suit', 'outer'], 'black'),
  item('male', 'outer-denim', 'outer', '牛仔夹克', 'denim', ['denim', 'jacket'], 'blue'),
  item('male', 'outer-bomber', 'outer', '棒球夹克', 'bomber', ['bomber', 'jacket'], 'green'),
  item('male', 'coat-wool', 'coat', '大衣', 'coat', ['coat', 'wool'], 'camel'),
  item('male', 'coat-trench', 'coat', '风衣', 'trench', ['trench', 'coat'], 'khaki'),
  item('male', 'bottom-trouser', 'bottom', '西裤', 'trouser', ['trouser', 'tailored', 'pants', 'bottom', 'suit-bottom'], 'black'),
  item('male', 'bottom-jeans', 'bottom', '牛仔裤', 'jeans', ['jeans', 'pants', 'bottom'], 'blue'),
  item('male', 'bottom-chinos', 'bottom', '卡其裤', 'chinos', ['chinos', 'pants', 'bottom'], 'khaki'),
  item('male', 'bottom-shorts', 'bottom', '短裤', 'shorts', ['shorts', 'bottom'], 'beige'),
  item('male', 'bottom-jogger', 'bottom', '运动裤', 'jogger', ['jogger', 'pants', 'bottom'], 'black'),
  item('male', 'bottom-cargo', 'bottom', '工装裤', 'cargo', ['cargo', 'pants', 'bottom'], 'khaki'),
  item('male', 'shoes-oxford', 'shoes', '牛津鞋', 'oxford', ['oxford', 'shoes'], 'black'),
  item('male', 'shoes-sneaker', 'shoes', '运动鞋', 'sneaker', ['sneaker', 'shoes'], 'white'),
  item('male', 'shoes-loafer', 'shoes', '乐福鞋', 'loafer', ['loafer', 'shoes'], 'brown'),
  item('male', 'shoes-boot', 'shoes', '靴子', 'boot', ['boot', 'shoes'], 'brown'),
  item('male', 'shoes-sandal', 'shoes', '凉鞋', 'sandal', ['sandal', 'shoes'], 'brown'),
  item('male', 'belt-slim', 'belt', '腰带', 'belt', ['belt'], 'brown'),
  item('male', 'neck-tie', 'neck', '领带', 'tie', ['tie', 'neck'], 'burgundy'),
  item('male', 'neck-scarf', 'neck', '围巾', 'scarf', ['scarf', 'neck'], 'burgundy'),
  item('male', 'hat-cap', 'hat', '棒球帽', 'cap', ['cap', 'hat'], 'navy'),
  item('male', 'hat-beanie', 'hat', '冷帽', 'beanie', ['beanie', 'hat'], 'gray'),
  item('male', 'glasses-frame', 'glasses', '眼镜', 'glasses', ['glasses'], 'brown'),
  item('male', 'bag-brief', 'bag', '公文包', 'brief', ['brief', 'bag'], 'brown'),
]

export const CATALOG: Garment[] = [...female, ...male]

export function garmentsFor(gender: Gender): Garment[] {
  return CATALOG.filter((g) => g.gender === gender)
}

export function garmentById(gender: Gender, id: string): Garment | undefined {
  return CATALOG.find((g) => g.gender === gender && g.id === id)
}

export function findByTag(gender: Gender, tag: string): Garment | undefined {
  const pool = garmentsFor(gender)
  return pool.find((g) => g.primary === tag) ?? pool.find((g) => g.tags.includes(tag))
}

export type ClosetTab = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'acc'

export function closetTab(g: Garment): ClosetTab {
  if (g.slot === 'top') return 'top'
  if (g.slot === 'dress') return 'dress'
  if (g.slot === 'bottom') return g.tags.includes('skirt') ? 'dress' : 'bottom'
  if (g.slot === 'outer' || g.slot === 'coat') return 'outer'
  if (g.slot === 'shoes') return 'shoes'
  return 'acc'
}

export const CLOSET_TABS: Array<{ id: ClosetTab; label: string }> = [
  { id: 'top', label: '上衣' },
  { id: 'bottom', label: '裤装' },
  { id: 'dress', label: '裙装' },
  { id: 'outer', label: '外套' },
  { id: 'shoes', label: '鞋' },
  { id: 'acc', label: '配饰' },
]
