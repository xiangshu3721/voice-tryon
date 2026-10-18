export type Neck = 'crew' | 'scoop' | 'v' | 'shirt' | 'turtleneck' | 'mandarin'
export type Sleeve = 'none' | 'short' | 'long' | 'puff'
export type Hem = 'crop' | 'waist' | 'hip' | 'thigh' | 'knee'
export type Material = 'cotton' | 'leather' | 'knit' | 'denim' | 'silk' | 'wool'

export type DrawSpec =
  | {
      kind: 'top'
      neck: Neck
      sleeve: Sleeve
      hem: Hem
      fit: number
      hood?: boolean
      buttons?: boolean
      pocket?: boolean
      material?: Material
    }
  | { kind: 'outer'; style: 'blazer' | 'zip' | 'cardigan' | 'denim' | 'bomber'; hem: Hem; fit: number; material?: Material }
  | { kind: 'coat'; style: 'wool' | 'trench'; material?: Material }
  | { kind: 'bottom'; style: 'straight' | 'taper' | 'wide' | 'shorts' | 'skirt' | 'pleat'; material?: Material; detail?: 'jeans' | 'cargo' }
  | { kind: 'dress'; style: 'column' | 'ruffle' | 'slip' | 'shirt'; material?: Material }
  | { kind: 'shoes'; style: 'sneaker' | 'heel' | 'loafer' | 'boot' | 'sandal' | 'oxford' }
  | { kind: 'belt' }
  | { kind: 'hat'; style: 'beret' | 'straw' | 'cap' | 'beanie' }
  | { kind: 'neck'; style: 'scarf' | 'tie' }
  | { kind: 'bag'; style: 'tote' | 'brief' }
  | { kind: 'glasses' }

export const DRAWS: Record<string, DrawSpec> = {
  'top-crop': { kind: 'top', neck: 'crew', sleeve: 'short', hem: 'crop', fit: 0 },
  'top-tee': { kind: 'top', neck: 'crew', sleeve: 'short', hem: 'hip', fit: 2 },
  'top-shirt': { kind: 'top', neck: 'shirt', sleeve: 'long', hem: 'hip', fit: 2, buttons: true },
  'top-cami': { kind: 'top', neck: 'scoop', sleeve: 'none', hem: 'waist', fit: -2, material: 'silk' },
  'top-hoodie': { kind: 'top', neck: 'crew', sleeve: 'long', hem: 'hip', fit: 10, hood: true, pocket: true, material: 'knit' },
  'top-turtleneck': { kind: 'top', neck: 'turtleneck', sleeve: 'long', hem: 'hip', fit: 2, material: 'knit' },
  'top-silk': { kind: 'top', neck: 'shirt', sleeve: 'long', hem: 'hip', fit: 0, buttons: true, material: 'silk' },
  'top-mandarin': { kind: 'top', neck: 'mandarin', sleeve: 'long', hem: 'hip', fit: 2, buttons: true },
  'top-polo': { kind: 'top', neck: 'shirt', sleeve: 'short', hem: 'hip', fit: 2, buttons: true },
  'top-knit': { kind: 'top', neck: 'crew', sleeve: 'long', hem: 'hip', fit: 4, material: 'knit' },
  'top-linen': { kind: 'top', neck: 'shirt', sleeve: 'long', hem: 'hip', fit: 6, material: 'cotton' },
  'outer-leather': { kind: 'outer', style: 'zip', hem: 'hip', fit: 8, material: 'leather' },
  'outer-blazer': { kind: 'outer', style: 'blazer', hem: 'hip', fit: 6, material: 'wool' },
  'outer-denim': { kind: 'outer', style: 'denim', hem: 'hip', fit: 8, material: 'denim' },
  'outer-cardigan': { kind: 'outer', style: 'cardigan', hem: 'thigh', fit: 6, material: 'knit' },
  'outer-bomber': { kind: 'outer', style: 'bomber', hem: 'waist', fit: 10, material: 'cotton' },
  'coat-wool': { kind: 'coat', style: 'wool', material: 'wool' },
  'coat-trench': { kind: 'coat', style: 'trench', material: 'cotton' },
  'bottom-jeans': { kind: 'bottom', style: 'straight', material: 'denim', detail: 'jeans' },
  'bottom-trouser': { kind: 'bottom', style: 'straight', material: 'wool' },
  'bottom-tailored': { kind: 'bottom', style: 'taper', material: 'wool' },
  'bottom-shorts': { kind: 'bottom', style: 'shorts' },
  'bottom-wide': { kind: 'bottom', style: 'wide' },
  'bottom-jogger': { kind: 'bottom', style: 'taper', material: 'knit' },
  'bottom-pleat': { kind: 'bottom', style: 'pleat' },
  'bottom-midi': { kind: 'bottom', style: 'skirt' },
  'bottom-chinos': { kind: 'bottom', style: 'straight', material: 'cotton' },
  'bottom-cargo': { kind: 'bottom', style: 'straight', material: 'cotton', detail: 'cargo' },
  'dress-column': { kind: 'dress', style: 'column' },
  'dress-ruffle': { kind: 'dress', style: 'ruffle', material: 'silk' },
  'dress-slip': { kind: 'dress', style: 'slip', material: 'silk' },
  'dress-shirt': { kind: 'dress', style: 'shirt' },
  'shoes-sneaker': { kind: 'shoes', style: 'sneaker' },
  'shoes-heel': { kind: 'shoes', style: 'heel' },
  'shoes-loafer': { kind: 'shoes', style: 'loafer' },
  'shoes-boot': { kind: 'shoes', style: 'boot' },
  'shoes-sandal': { kind: 'shoes', style: 'sandal' },
  'shoes-oxford': { kind: 'shoes', style: 'oxford' },
  'belt-slim': { kind: 'belt' },
  'hat-beret': { kind: 'hat', style: 'beret' },
  'hat-straw': { kind: 'hat', style: 'straw' },
  'hat-cap': { kind: 'hat', style: 'cap' },
  'hat-beanie': { kind: 'hat', style: 'beanie' },
  'neck-scarf': { kind: 'neck', style: 'scarf' },
  'neck-tie': { kind: 'neck', style: 'tie' },
  'bag-tote': { kind: 'bag', style: 'tote' },
  'bag-brief': { kind: 'bag', style: 'brief' },
  'glasses-frame': { kind: 'glasses' },
}
