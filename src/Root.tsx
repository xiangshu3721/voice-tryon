import { useState } from 'react'
import App from './App'
import { MirrorApp } from './mirror/MirrorApp'

type Mode = 'mirror' | 'illustration'

/** 能用摄像头就进镜子模式；否则退回插画假人（SvgLayerRenderer）。 */
export function cameraSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext !== false
}

export default function Root() {
  const canMirror = cameraSupported()
  const [mode, setMode] = useState<Mode>(() => {
    if (!canMirror) return 'illustration'
    const q = new URLSearchParams(window.location.search).get('mode')
    return q === 'illustration' ? 'illustration' : 'mirror'
  })

  if (mode === 'mirror' && canMirror) return <MirrorApp onUseIllustration={() => setMode('illustration')} />
  return (
    <App
      onMirror={canMirror ? () => setMode('mirror') : undefined}
      notice={canMirror ? undefined : '这个浏览器打不开摄像头，先用插画模特试穿。'}
    />
  )
}
