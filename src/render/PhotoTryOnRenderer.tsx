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

/**
 * 试穿渲染器：
 * - mirror-live：摄像头实时镜子（默认，见 src/mirror/MirrorStage.tsx）
 * - svg-layers：插画假人分层（不支持摄像头或用户选择时的兜底，保留）
 * - photo-ai / ai-tryon：真人 AI 试穿，接口见 AiTryOnRenderer.ts，默认关闭
 */
export type TryOnRendererId = 'mirror-live' | 'svg-layers' | 'photo-ai' | 'ai-tryon'

/** 插画模式里的渲染器。改成 photo-ai 会走到占位，不会偷偷请求外部模型。 */
export const ACTIVE_TRYON_RENDERER: TryOnRendererId = 'svg-layers'
