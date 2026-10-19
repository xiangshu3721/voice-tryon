/**
 * 身体关键点 → 贴合四边形。
 * 约定：所有点都已经是「镜像后的屏幕像素」，L = 画面左侧。
 * 前置摄像头镜像后，人的左肩（MediaPipe 11）落在画面左侧，所以 L 取 11/23/25/27。
 */
import { dist, mid, type Pt, type Quad } from './warp'

export type Category = 'top' | 'outer' | 'bottom' | 'dress'
export type Length = 'crop' | 'hip' | 'thigh' | 'knee' | 'calf' | 'ankle'

/** 锚点都是相对坐标（0–1），相对单品图的宽高。 */
export interface Anchors {
  neck?: Pt
  shoulderL?: Pt
  shoulderR?: Pt
  waist?: Pt
  waistL?: Pt
  waistR?: Pt
  hipL: Pt
  hipR: Pt
  hem: Pt
  hemL?: Pt
  hemR?: Pt
}

export interface Body {
  shL: Pt
  shR: Pt
  hipL: Pt
  hipR: Pt
  kneeL?: Pt
  kneeR?: Pt
  ankleL?: Pt
  ankleR?: Pt
  /** 胯部不在画面里时，按肩宽推出来的 */
  hipsEstimated?: boolean
}

/** 衣服肩点比肩关节略宽（布料包住肩头）。 */
export const SHOULDER_SPREAD = 1.22
/** 腰带两侧相对髋关节的外扩。 */
export const HIP_SPREAD = 1.55

function unit(a: Pt, b: Pt, fallback: Pt = { x: 1, y: 0 }): Pt {
  const d = dist(a, b)
  if (d < 1e-6) return fallback
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }
}

function px(p: Pt, w: number, h: number): Pt {
  return { x: p.x * w, y: p.y * h }
}

/** 只有肩膀时，按人体比例补出胯部（躯干长约等于肩关节宽的 1.3 倍）。 */
export function completeBody(raw: { shL: Pt; shR: Pt; hipL?: Pt; hipR?: Pt; kneeL?: Pt; kneeR?: Pt; ankleL?: Pt; ankleR?: Pt }): Body {
  const { shL, shR } = raw
  if (raw.hipL && raw.hipR) return { ...raw, hipL: raw.hipL, hipR: raw.hipR }
  const across = unit(shL, shR)
  // 屏幕坐标 y 向下：垂直于肩线、朝下的方向
  const down = { x: -across.y, y: across.x }
  const w = dist(shL, shR)
  const torso = w * 1.3
  const half = w * 0.36
  const c = mid(shL, shR)
  const ch = { x: c.x + down.x * torso, y: c.y + down.y * torso }
  return {
    ...raw,
    hipL: { x: ch.x - across.x * half, y: ch.y - across.y * half },
    hipR: { x: ch.x + across.x * half, y: ch.y + across.y * half },
    hipsEstimated: true,
  }
}

/** 上衣 / 外套 / 连衣裙：图上「左肩、右肩、右胯、左胯」→ 身上对应四点。 */
export function upperQuads(body: Body, a: Anchors, imgW: number, imgH: number): { src: Quad; dst: Quad } | null {
  if (!a.shoulderL || !a.shoulderR) return null
  const sL = px(a.shoulderL, imgW, imgH)
  const sR = px(a.shoulderR, imgW, imgH)
  const hL = px(a.hipL, imgW, imgH)
  const hR = px(a.hipR, imgW, imgH)
  const imgShoulder = dist(sL, sR)
  if (imgShoulder < 1) return null
  const hipRatio = dist(hL, hR) / imgShoulder

  const cs = mid(body.shL, body.shR)
  const hs = { x: ((body.shR.x - body.shL.x) / 2) * SHOULDER_SPREAD, y: ((body.shR.y - body.shL.y) / 2) * SHOULDER_SPREAD }
  const halfShoulder = Math.hypot(hs.x, hs.y)
  const ch = mid(body.hipL, body.hipR)
  const uh = unit(body.hipL, body.hipR, unit(body.shL, body.shR))
  const halfHip = halfShoulder * hipRatio

  const dst: Quad = [
    { x: cs.x - hs.x, y: cs.y - hs.y },
    { x: cs.x + hs.x, y: cs.y + hs.y },
    { x: ch.x + uh.x * halfHip, y: ch.y + uh.y * halfHip },
    { x: ch.x - uh.x * halfHip, y: ch.y - uh.y * halfHip },
  ]
  return { src: [sL, sR, hR, hL], dst }
}

function lowerTarget(body: Body, length: Length): { center: Pt; spread: number } {
  const cs = mid(body.shL, body.shR)
  const ch = mid(body.hipL, body.hipR)
  const torso = dist(cs, ch)
  const down = unit(cs, ch, { x: 0, y: 1 })
  const at = (k: number) => ({ x: ch.x + down.x * torso * k, y: ch.y + down.y * torso * k })
  const knee = body.kneeL && body.kneeR ? mid(body.kneeL, body.kneeR) : at(0.95)
  const ankle = body.ankleL && body.ankleR ? mid(body.ankleL, body.ankleR) : at(1.9)
  const ankleSpread = body.ankleL && body.ankleR ? dist(body.ankleL, body.ankleR) : 0
  switch (length) {
    case 'crop':
    case 'hip':
      return { center: at(0.25), spread: 0 }
    case 'thigh':
      return { center: at(0.55), spread: 0 }
    case 'knee':
      return { center: knee, spread: 0 }
    case 'calf':
      return { center: { x: knee.x + (ankle.x - knee.x) * 0.55, y: knee.y + (ankle.y - knee.y) * 0.55 }, spread: ankleSpread * 0.55 }
    default:
      return { center: ankle, spread: ankleSpread }
  }
}

/** 下装：图上「腰左、腰右、下摆右、下摆左」→ 身上腰线和膝/踝。 */
export function lowerQuads(body: Body, a: Anchors, length: Length, imgW: number, imgH: number): { src: Quad; dst: Quad } | null {
  const wL = px(a.waistL ?? a.hipL, imgW, imgH)
  const wR = px(a.waistR ?? a.hipR, imgW, imgH)
  const eL = px(a.hemL ?? { x: a.hipL.x, y: a.hem.y }, imgW, imgH)
  const eR = px(a.hemR ?? { x: a.hipR.x, y: a.hem.y }, imgW, imgH)
  const imgWaist = dist(wL, wR)
  if (imgWaist < 1) return null
  const hemRatio = dist(eL, eR) / imgWaist

  const cs = mid(body.shL, body.shR)
  const ch = mid(body.hipL, body.hipR)
  const uh = unit(body.hipL, body.hipR, unit(body.shL, body.shR))
  // 腰线比髋关节高一点
  const cw = { x: ch.x + (cs.x - ch.x) * 0.1, y: ch.y + (cs.y - ch.y) * 0.1 }
  const halfWaist = (dist(body.hipL, body.hipR) / 2) * HIP_SPREAD
  const target = lowerTarget(body, length)
  const halfHem = Math.max(halfWaist * hemRatio, target.spread * 0.62)

  const dst: Quad = [
    { x: cw.x - uh.x * halfWaist, y: cw.y - uh.y * halfWaist },
    { x: cw.x + uh.x * halfWaist, y: cw.y + uh.y * halfWaist },
    { x: target.center.x + uh.x * halfHem, y: target.center.y + uh.y * halfHem },
    { x: target.center.x - uh.x * halfHem, y: target.center.y - uh.y * halfHem },
  ]
  return { src: [wL, wR, eR, eL], dst }
}
