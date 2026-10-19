import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { lowerQuads, upperQuads, type Body, type Category } from './fit'
import { loadPoseLandmarker, PoseTracker, type PoseFrame } from './pose'
import { imageUrl, LAYER_ORDER, type PhotoGarment } from './wardrobe'
import { buildMesh, drawMesh } from './warp'

export type CamState = 'intro' | 'requesting' | 'denied' | 'nocamera' | 'error' | 'live'
export type ModelState = 'idle' | 'loading' | 'ready' | 'error'
export type PersonState = 'none' | 'near' | 'far' | 'ok'

export interface MirrorStageHandle {
  /** 把当前画面（含衣服）合成成 PNG。只在本地，不上传。 */
  snapshot(): Promise<Blob | null>
}

interface Props {
  garments: PhotoGarment[]
  onUseIllustration: () => void
  /** 自动申请摄像头（例如之前已授权过） */
  autoStart?: boolean
  onLive?: () => void
}

const FADE_IN = 280
const FADE_OUT = 200
const LOST_GRACE = 450

interface Shown {
  g: PhotoGarment
  from: number
}
interface Leaving {
  g: PhotoGarment
  start: number
}

const imageCache = new Map<string, HTMLImageElement>()
function garmentImage(g: PhotoGarment): HTMLImageElement {
  let img = imageCache.get(g.id)
  if (!img) {
    img = new Image()
    img.decoding = 'async'
    img.src = imageUrl(g)
    imageCache.set(g.id, img)
  }
  return img
}

export function preloadGarments(list: PhotoGarment[]) {
  for (const g of list) garmentImage(g)
}

function ease(t: number) {
  const k = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - k, 3)
}

function quadsFor(g: PhotoGarment, body: Body) {
  const { w, h } = g.size
  return g.category === 'bottom' ? lowerQuads(body, g.anchors, g.length, w, h) : upperQuads(body, g.anchors, w, h)
}

function drawGarment(ctx: CanvasRenderingContext2D, g: PhotoGarment, body: Body, alpha: number, lift: number) {
  const img = garmentImage(g)
  if (!img.complete || !img.naturalWidth || alpha <= 0.01) return
  const q = quadsFor(g, body)
  if (!q) return
  // size 是生成衣库时的尺寸；按真实像素缩放，防止压缩改了尺寸
  const sx = img.naturalWidth / g.size.w
  const sy = img.naturalHeight / g.size.h
  const src = q.src.map((p) => ({ x: p.x * sx, y: p.y * sy })) as typeof q.src
  const dst = lift ? (q.dst.map((p) => ({ x: p.x, y: p.y - lift })) as typeof q.dst) : q.dst
  const mesh = buildMesh(img.naturalWidth, img.naturalHeight, src, dst, 6, 8)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(30, 20, 10, 0.22)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3
  drawMesh(ctx, img, mesh)
  ctx.restore()
}

function mirrorResult(r: PoseLandmarkerResult): PoseLandmarkerResult {
  return {
    ...r,
    landmarks: r.landmarks.map((pose) => pose.map((p) => ({ ...p, x: 1 - p.x }))),
  } as PoseLandmarkerResult
}

export const MirrorStage = forwardRef<MirrorStageHandle, Props>(function MirrorStage({ garments, onUseIllustration, autoStart, onLive }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const trackerRef = useRef(new PoseTracker())
  const shownRef = useRef<Partial<Record<Category, Shown>>>({})
  const leavingRef = useRef<Leaving[]>([])
  const frameRef = useRef<{ pose: PoseFrame | null; at: number }>({ pose: null, at: 0 })
  const personRef = useRef<PersonState>('none')

  const [cam, setCam] = useState<CamState>('intro')
  const [model, setModel] = useState<ModelState>('idle')
  const [person, setPerson] = useState<PersonState>('none')

  // 衣服切换：新的淡入、旧的淡出
  useEffect(() => {
    const now = performance.now()
    const next: Partial<Record<Category, Shown>> = {}
    const prev = shownRef.current
    for (const g of garments) {
      const old = prev[g.category]
      next[g.category] = old && old.g.id === g.id ? old : { g, from: now }
      garmentImage(g)
    }
    for (const cat of Object.keys(prev) as Category[]) {
      const old = prev[cat]!
      if (next[cat]?.g.id !== old.g.id) leavingRef.current.push({ g: old.g, start: now })
    }
    shownRef.current = next
  }, [garments])

  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return
    setModel('loading')
    try {
      landmarkerRef.current = await loadPoseLandmarker()
      setModel('ready')
    } catch (err) {
      console.warn('pose model', err)
      setModel('error')
    }
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('nocamera')
      return
    }
    setCam('requesting')
    void loadModel()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play().catch(() => undefined)
      setCam('live')
      try {
        localStorage.setItem('yanyi.camera.ok', '1')
      } catch {
        /* ignore */
      }
      onLive?.()
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') setCam('denied')
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCam('nocamera')
      else setCam('error')
    }
  }, [loadModel, onLive])

  useEffect(() => {
    if (autoStart) void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    },
    [],
  )

  // 渲染循环
  useEffect(() => {
    if (cam !== 'live') return
    let raf = 0
    let lastVideoTime = -1
    let lastTs = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return
      const W = video.videoWidth
      const H = video.videoHeight
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const now = performance.now()

      const lm = landmarkerRef.current
      if (lm && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        const ts = Math.max(now, lastTs + 1)
        lastTs = ts
        let result: PoseLandmarkerResult | null = null
        try {
          result = lm.detectForVideo(video, ts)
        } catch (err) {
          console.warn('detect', err)
        }
        const pose = trackerRef.current.update(result ? mirrorResult(result) : null, ts, W, H)
        if (pose) frameRef.current = { pose, at: now }
      }

      // 镜像画面
      ctx.save()
      ctx.setTransform(-1, 0, 0, 1, W, 0)
      ctx.drawImage(video, 0, 0, W, H)
      ctx.restore()

      const f = frameRef.current
      const fresh = f.pose && now - f.at < LOST_GRACE
      let p: PersonState = 'none'
      if (fresh && f.pose) {
        p = f.pose.shoulderFrac > 0.62 ? 'near' : f.pose.shoulderFrac < 0.1 ? 'far' : 'ok'
        const body = f.pose.body
        const shown = shownRef.current
        leavingRef.current = leavingRef.current.filter((l) => now - l.start < FADE_OUT)
        for (const cat of LAYER_ORDER) {
          for (const l of leavingRef.current) {
            if (l.g.category === cat) drawGarment(ctx, l.g, body, 1 - (now - l.start) / FADE_OUT, 0)
          }
          const s = shown[cat]
          if (s) {
            const k = ease((now - s.from) / FADE_IN)
            const shoulderW = Math.hypot(body.shR.x - body.shL.x, body.shR.y - body.shL.y)
            drawGarment(ctx, s.g, body, k, (1 - k) * shoulderW * 0.08)
          }
        }
      }
      if (p !== personRef.current) {
        personRef.current = p
        setPerson(p)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cam])

  useImperativeHandle(
    ref,
    () => ({
      snapshot: () =>
        new Promise<Blob | null>((resolve) => {
          const canvas = canvasRef.current
          if (!canvas || !canvas.width) return resolve(null)
          const out = document.createElement('canvas')
          out.width = canvas.width
          out.height = canvas.height
          const ctx = out.getContext('2d')!
          ctx.drawImage(canvas, 0, 0)
          const s = Math.max(14, Math.round(out.width * 0.028))
          ctx.font = `${s}px "Songti SC", "Noto Serif SC", serif`
          ctx.fillStyle = 'rgba(255, 250, 242, 0.88)'
          ctx.textAlign = 'right'
          ctx.fillText('言衣 · 镜中试穿', out.width - s, out.height - s)
          out.toBlob((b) => resolve(b), 'image/png')
        }),
    }),
    [],
  )

  const hint =
    cam !== 'live'
      ? ''
      : model === 'loading' || model === 'idle'
        ? '正在加载人体识别…'
        : model === 'error'
          ? ''
          : person === 'none' || person === 'near'
            ? '退后一点，让上半身入镜'
            : person === 'far'
              ? '再走近一点'
              : ''

  return (
    <div className="stage-view" data-cam={cam} data-model={model} data-person={person} data-testid="mirror-stage">
      <video ref={videoRef} className="stage-video" playsInline muted autoPlay aria-hidden="true" />
      <canvas ref={canvasRef} className="stage-canvas" aria-label="镜子画面" />

      {cam === 'live' && hint && (
        <p className="stage-hint" role="status" data-testid="stage-hint">
          {model === 'loading' && <span className="spinner" aria-hidden="true" />}
          {hint}
        </p>
      )}
      {cam === 'live' && model === 'error' && (
        <button type="button" className="stage-hint as-button" onClick={() => void loadModel()}>
          人体识别没加载上，点这里重试
        </button>
      )}

      {cam !== 'live' && (
        <div className="stage-card" role="dialog" aria-live="polite">
          {cam === 'intro' && (
            <>
              <p className="card-title">像照镜子一样试穿</p>
              <p className="card-copy">打开前置摄像头，衣服会贴在你身上。画面只在这台设备里处理，不上传。</p>
              <button type="button" className="primary" data-testid="start-camera" onClick={() => void start()}>
                打开摄像头
              </button>
            </>
          )}
          {cam === 'requesting' && (
            <>
              <p className="card-title">请允许使用摄像头</p>
              <p className="card-copy">浏览器会弹出权限提示，点「允许」就好。</p>
            </>
          )}
          {cam === 'denied' && (
            <>
              <p className="card-title">摄像头被拒绝了</p>
              <p className="card-copy">在地址栏左侧的权限设置里允许摄像头，再点重试。也可以先用插画模特。</p>
              <button type="button" className="primary" data-testid="retry-camera" onClick={() => void start()}>
                重试
              </button>
            </>
          )}
          {cam === 'nocamera' && (
            <>
              <p className="card-title">没找到摄像头</p>
              <p className="card-copy">这台设备没有可用的摄像头，先用插画模特试穿吧。</p>
            </>
          )}
          {cam === 'error' && (
            <>
              <p className="card-title">摄像头打不开</p>
              <p className="card-copy">可能被别的应用占用了。关掉它们再重试。</p>
              <button type="button" className="primary" onClick={() => void start()}>
                重试
              </button>
            </>
          )}
          <button type="button" className="link" data-testid="use-illustration" onClick={onUseIllustration}>
            用插画模特
          </button>
        </div>
      )}
    </div>
  )
})
