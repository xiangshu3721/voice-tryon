/**
 * 预留：真人 AI 试穿渲染器（默认关闭）。
 *
 * 流程设想：镜子模式拍照 → 前端把「这张照片 + 当前穿搭的单品 id」交给自家 Product API
 * （例如 POST /api/tryon），Product API 再经 AI Gateway 转到具体的试衣模型，
 * 返回一张合成好的真人试穿图。
 *
 * 这里只写接口和开关，不接任何付费服务，也不放任何 key。
 * key 只应存在服务端（AI Gateway），前端永远拿不到。
 */
import type { Gender } from '../types'

export interface AiTryOnRequest {
  /** 拍照得到的 PNG（只在用户明确同意上传时才会用到） */
  photo: Blob
  gender: Gender
  /** 当前穿搭：衣库里的单品 id，按叠穿顺序 */
  garmentIds: string[]
}

export interface AiTryOnResult {
  image: Blob
  /** 模型或服务名，便于界面标注「AI 合成」 */
  provider: string
}

export interface AiTryOnRenderer {
  readonly id: 'ai-tryon'
  /** 是否可用（需要配置了 Product API 地址，并且用户同意上传） */
  available(): boolean
  render(req: AiTryOnRequest, signal?: AbortSignal): Promise<AiTryOnResult>
}

/** 默认关闭。打开前需要：服务端接好 AI Gateway、隐私说明、用户逐次确认上传。 */
export const AI_TRYON_ENABLED = false

/** 占位实现：永远不可用，调用即报错，保证不会偷偷请求外部服务。 */
export class DisabledAiTryOnRenderer implements AiTryOnRenderer {
  readonly id = 'ai-tryon' as const
  available() {
    return false
  }
  render(): Promise<AiTryOnResult> {
    return Promise.reject(new Error('AI 试穿未开启'))
  }
}

export function createAiTryOnRenderer(): AiTryOnRenderer {
  return new DisabledAiTryOnRenderer()
}
