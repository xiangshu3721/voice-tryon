import type { Gender, Outfit } from '../types'

/**
 * 真人照片试穿占位。V1 不调用任何试衣模型。
 * 以后由 Product API `/api/tryon` 接收用户照片和当前搭配，
 * AI Gateway 再转到具体模型。前端只替换渲染器。
 */
export function PhotoTryOnRenderer({ gender }: { gender: Gender; outfit: Outfit }) {
  const who = gender === 'female' ? '女装' : '男装'
  return (
    <div className="photo-fallback" role="note">
      <p>真人照片试穿还没接上。</p>
      <p>现在先看{who}插画模特。衣服仍然按层叠在身上。</p>
    </div>
  )
}

export type TryOnRendererId = 'svg-layers' | 'photo-ai'

/** 默认插画分层。改成 photo-ai 会走到占位，不会偷偷请求外部模型。 */
export const ACTIVE_TRYON_RENDERER: TryOnRendererId = 'svg-layers'
