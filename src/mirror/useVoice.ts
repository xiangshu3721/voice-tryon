import { useCallback, useEffect, useRef, useState } from 'react'

export type VoicePhase = 'idle' | 'listening'

export const VOICE_UNSUPPORTED = '这个浏览器听不到你说话（iPhone 和微信里常见），可以打字，或用输入法的语音键。'
const MISSED = '没听清，再说一次，或直接打字。'
const DENIED = '麦克风没打开。可以在浏览器里允许，或直接打字。'

function supported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/** Web Speech zh-CN。不支持时由界面退回打字和快捷按钮。 */
export function useVoice(onFinal: (text: string) => void) {
  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [interim, setInterim] = useState('')
  const [notice, setNotice] = useState('')
  const [available, setAvailable] = useState(true)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const finalRef = useRef('')
  const ignoreEnd = useRef(false)
  const cb = useRef(onFinal)
  cb.current = onFinal

  useEffect(() => setAvailable(supported()), [])

  const ensure = useCallback(() => {
    if (recRef.current) return recRef.current
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return null
    const rec = new Ctor()
    rec.lang = 'zh-CN'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (event) => {
      let fin = ''
      let mid = ''
      for (let i = 0; i < event.results.length; i++) {
        const bit = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) fin += bit
        else mid += bit
      }
      if (fin) finalRef.current = fin
      setInterim(mid || fin)
    }
    rec.onerror = (event) => {
      ignoreEnd.current = true
      setPhase('idle')
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setNotice(DENIED)
      else if (event.error !== 'aborted') setNotice(MISSED)
    }
    rec.onend = () => {
      setPhase('idle')
      setInterim('')
      if (ignoreEnd.current) {
        ignoreEnd.current = false
        return
      }
      const text = finalRef.current.trim()
      finalRef.current = ''
      if (!text) {
        setNotice(MISSED)
        return
      }
      cb.current(text)
    }
    recRef.current = rec
    return rec
  }, [])

  const start = useCallback(() => {
    const rec = supported() ? ensure() : null
    if (!rec) {
      setAvailable(false)
      setNotice(VOICE_UNSUPPORTED)
      return
    }
    finalRef.current = ''
    ignoreEnd.current = false
    setNotice('')
    setPhase('listening')
    try {
      rec.start()
    } catch {
      setPhase('idle')
      setNotice(MISSED)
    }
  }, [ensure])

  const stop = useCallback(() => recRef.current?.stop(), [])

  return { phase, interim, notice, setNotice, available, start, stop }
}
