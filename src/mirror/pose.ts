/**
 * 本地 MediaPipe Pose Landmarker。
 * wasm 和模型都从 public/ 加载，不走海外 CDN。
 * 坐标：镜像后的画面像素（左 = 画面左 = 人的左肩在前置镜像里）。
 */
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { PointFilter } from './filter'
import { completeBody, type Body } from './fit'
import type { Pt } from './warp'

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models/pose_landmarker_lite.task`

export type PoseStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PoseFrame {
  body: Body
  /** 肩宽相对画面宽度；太小说明人太远。 */
  shoulderFrac: number
  visible: boolean
}

function asset(path: string) {
  return `${BASE}${path.replace(/^\//, '')}`
}

async function fileset() {
  const vision = await import('@mediapipe/tasks-vision')
  const simd = await vision.FilesetResolver.isSimdSupported()
  const base = simd ? 'vision_wasm_internal' : 'vision_wasm_nosimd_internal'
  const [js, wasm] = await Promise.all([
    fetch(asset(`wasm/${base}.js`)).then((r) => {
      if (!r.ok) throw new Error(`wasm js ${r.status}`)
      return r.text()
    }),
    fetch(asset(`wasm/${base}.wasm`)).then((r) => {
      if (!r.ok) throw new Error(`wasm bin ${r.status}`)
      return r.arrayBuffer()
    }),
  ])
  return {
    wasmLoaderPath: URL.createObjectURL(new Blob([js], { type: 'text/javascript' })),
    wasmBinaryPath: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
  }
}

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const vision = await import('@mediapipe/tasks-vision')
  const [fs, modelBuf] = await Promise.all([
    fileset(),
    fetch(MODEL_URL).then(async (r) => {
      if (!r.ok) throw new Error(`model ${r.status}`)
      return new Uint8Array(await r.arrayBuffer())
    }),
  ])
  return vision.PoseLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetBuffer: modelBuf.slice(), delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

export async function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!isIOS()) {
    try {
      return await Promise.race([
        createLandmarker('GPU'),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('gpu timeout')), 9000)),
      ])
    } catch {
      /* fall through */
    }
  }
  return createLandmarker('CPU')
}

const IDX = {
  shL: 11,
  shR: 12,
  hipL: 23,
  hipR: 24,
  kneeL: 25,
  kneeR: 26,
  ankleL: 27,
  ankleR: 28,
} as const

function lm(result: PoseLandmarkerResult, i: number): { x: number; y: number; v: number } | null {
  const p = result.landmarks?.[0]?.[i]
  if (!p) return null
  return { x: p.x, y: p.y, v: p.visibility ?? 0 }
}

export class PoseTracker {
  private filters: Record<string, PointFilter> = {
    shL: new PointFilter(1.6, 0.7),
    shR: new PointFilter(1.6, 0.7),
    hipL: new PointFilter(1.2, 0.5),
    hipR: new PointFilter(1.2, 0.5),
    kneeL: new PointFilter(1.0, 0.4),
    kneeR: new PointFilter(1.0, 0.4),
    ankleL: new PointFilter(1.0, 0.4),
    ankleR: new PointFilter(1.0, 0.4),
  }
  private lastTs = 0
  private miss = 0

  reset() {
    for (const f of Object.values(this.filters)) f.reset()
    this.miss = 0
  }

  /**
   * @param mirrored 画面是否已经水平镜像（前置默认 true）。
   *                 镜像后：MediaPipe 的 x 仍是源视频坐标，需要再翻一次才和屏幕一致。
   *                 我们在 detect 前把视频画到已镜像的 canvas，所以 landmarks 直接按 canvas 像素用。
   */
  update(result: PoseLandmarkerResult | null, timeMs: number, canvasW: number, canvasH: number): PoseFrame | null {
    if (!result?.landmarks?.[0]) {
      this.miss++
      if (this.miss > 18) this.reset()
      return null
    }
    const shL = lm(result, IDX.shL)
    const shR = lm(result, IDX.shR)
    if (!shL || !shR || shL.v < 0.35 || shR.v < 0.35) {
      this.miss++
      return null
    }
    this.miss = 0
    const t = timeMs || performance.now()
    const toPx = (p: { x: number; y: number }, key: string): Pt => {
      const f = this.filters[key].filter(p, t)
      return { x: f.x * canvasW, y: f.y * canvasH }
    }
    const raw: Parameters<typeof completeBody>[0] = {
      shL: toPx(shL, 'shL'),
      shR: toPx(shR, 'shR'),
    }
    const hipL = lm(result, IDX.hipL)
    const hipR = lm(result, IDX.hipR)
    if (hipL && hipR && hipL.v > 0.25 && hipR.v > 0.25) {
      raw.hipL = toPx(hipL, 'hipL')
      raw.hipR = toPx(hipR, 'hipR')
    }
    const kneeL = lm(result, IDX.kneeL)
    const kneeR = lm(result, IDX.kneeR)
    if (kneeL && kneeR && kneeL.v > 0.2 && kneeR.v > 0.2) {
      raw.kneeL = toPx(kneeL, 'kneeL')
      raw.kneeR = toPx(kneeR, 'kneeR')
    }
    const ankleL = lm(result, IDX.ankleL)
    const ankleR = lm(result, IDX.ankleR)
    if (ankleL && ankleR && ankleL.v > 0.15 && ankleR.v > 0.15) {
      raw.ankleL = toPx(ankleL, 'ankleL')
      raw.ankleR = toPx(ankleR, 'ankleR')
    }
    const body = completeBody(raw)
    const shoulderFrac = Math.hypot(body.shR.x - body.shL.x, body.shR.y - body.shL.y) / canvasW
    this.lastTs = t
    return { body, shoulderFrac, visible: true }
  }

  get lastTimestamp() {
    return this.lastTs
  }
}
