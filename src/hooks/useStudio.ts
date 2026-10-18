import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { exportLookPng } from '../export/png'
import { SUGGESTIONS } from '../nlu/parser'
import { createIntentProvider } from '../stylist/providers'
import { initialSession, toggleGarment, type Session, type Turn } from '../stylist/apply'
import type { Gender } from '../types'
import { wornLines } from '../wardrobe/view'
import { loadLooks, loadPrefs, lookTitle, saveLooks, savePrefs, type SavedLook } from '../storage/looks'

export type Phase = 'idle' | 'listening' | 'thinking'

const UNSUPPORTED = '这个浏览器听不到你说话，可以打字，或用输入法的语音键'
const MISSED = '没听清，再说一次，或直接打字。'
const DENIED = '麦克风没打开。可以在浏览器里允许，或直接打字。'

function supportedNow(): boolean {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 1
  window.speechSynthesis.speak(utter)
}

export function useStudio() {
  const [session, setSession] = useState<Session>(() => initialSession('female'))
  const [looks, setLooks] = useState<SavedLook[]>([])
  const [speakReplies, setSpeakReplies] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [caption, setCaption] = useState('试试说：来套通勤的')
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('点一件衣服，或说「来套通勤的」。')
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [speechOn, setSpeechOn] = useState(true)
  const [tab, setTab] = useState<'closet' | 'wearing' | 'saved'>('closet')
  const [closetTab, setClosetTab] = useState<'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'acc'>('top')
  const svgRef = useRef<SVGSVGElement | null>(null)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const finalRef = useRef('')
  const ignoreEndRef = useRef(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    setLooks(loadLooks())
    setSpeakReplies(loadPrefs().speak)
    setSpeechOn(supportedNow())
  }, [])

  const provider = useMemo(() => createIntentProvider(), [])

  const applyTurn = useCallback(
    async (turn: Turn, heard: string, pause: boolean) => {
      if (pause) {
        setPhase('thinking')
        setCaption(heard)
        await new Promise((resolve) => setTimeout(resolve, 320))
      }
      setSession(turn.session)
      setReply(turn.reply)
      setCaption(turn.reply)
      setTranscript(heard)
      setNotice('')
      if (turn.action === 'save') {
        const look: SavedLook = {
          id: `${Date.now()}`,
          name: lookTitle(turn.session.outfit, turn.session.gender, turn.session.lastStyle),
          gender: turn.session.gender,
          outfit: turn.session.outfit,
          createdAt: Date.now(),
        }
        setLooks((current) => {
          const next = [look, ...current].slice(0, 24)
          saveLooks(next)
          return next
        })
        setNotice('已收进我的搭配')
        setTab('saved')
      }
      if (turn.action === 'switch-gender') setClosetTab('top')
      setPhase('idle')
      if (speakReplies && turn.reply) speak(turn.reply)
    },
    [speakReplies],
  )

  const submitText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || phase === 'thinking') return
      setDraft('')
      const turn = await provider.interpret(text, sessionRef.current)
      await applyTurn(turn, text, true)
    },
    [applyTurn, phase, provider],
  )

  const wear = useCallback(
    (id: string) => {
      const turn = toggleGarment(sessionRef.current, id)
      void applyTurn(turn, turn.reply, false)
    },
    [applyTurn],
  )

  const removeWorn = useCallback(
    (slotName: string) => {
      const current = sessionRef.current.outfit.slots[slotName as keyof Session['outfit']['slots']]
      if (!current) return
      wear(current.id)
    },
    [wear],
  )

  const wearLook = useCallback((look: SavedLook) => {
    const current = sessionRef.current
    setSession({
      gender: look.gender,
      outfit: look.outfit,
      focus: undefined,
      lastStyle: current.lastStyle,
      past: [
        ...current.past,
        { gender: current.gender, outfit: current.outfit, focus: current.focus, lastStyle: current.lastStyle },
      ].slice(-20),
    })
    setReply(`换上了「${look.name}」。`)
    setCaption(`换上了「${look.name}」。`)
  }, [])

  const deleteLook = useCallback((id: string) => {
    setLooks((current) => {
      const next = current.filter((look) => look.id !== id)
      saveLooks(next)
      return next
    })
  }, [])

  const toggleSpeak = useCallback(() => {
    setSpeakReplies((value) => {
      const speakNext = !value
      savePrefs({ speak: speakNext })
      if (!speakNext && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      return speakNext
    })
  }, [])

  const ensureRec = useCallback(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return null
    if (recRef.current) return recRef.current
    const rec = new Ctor()
    rec.lang = 'zh-CN'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const bit = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalText += bit
        else interim += bit
      }
      if (finalText) finalRef.current = finalText
      setCaption(interim || finalText || '正在听…')
    }
    rec.onerror = (event) => {
      ignoreEndRef.current = true
      setPhase('idle')
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setNotice(DENIED)
      else if (event.error !== 'aborted') setNotice(MISSED)
    }
    rec.onend = () => {
      setPhase('idle')
      if (ignoreEndRef.current) {
        ignoreEndRef.current = false
        return
      }
      const text = finalRef.current.trim()
      finalRef.current = ''
      if (!text) {
        setNotice(MISSED)
        setCaption('没听清')
        return
      }
      void submitText(text)
    }
    recRef.current = rec
    return rec
  }, [submitText])

  const startListen = useCallback(() => {
    if (!supportedNow()) {
      setSpeechOn(false)
      setNotice(UNSUPPORTED)
      return
    }
    const rec = ensureRec()
    if (!rec) {
      setSpeechOn(false)
      setNotice(UNSUPPORTED)
      return
    }
    finalRef.current = ''
    ignoreEndRef.current = false
    setNotice('')
    setPhase('listening')
    setCaption('正在听…')
    try {
      rec.start()
    } catch {
      setPhase('idle')
      setNotice(MISSED)
    }
  }, [ensureRec])

  const stopListen = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const setGender = useCallback(
    (gender: Gender) => {
      if (gender === sessionRef.current.gender) return
      void submitText(gender === 'male' ? '换男装' : '换女装')
    },
    [submitText],
  )

  const exportPng = useCallback(async () => {
    if (!svgRef.current) return
    try {
      const lines = wornLines(sessionRef.current.gender, sessionRef.current.outfit).map((line) => line.label)
      await exportLookPng(svgRef.current, lines)
    } catch {
      setNotice('图片没能导出，再试一次。')
    }
  }, [])

  return {
    session,
    looks,
    speakReplies,
    phase,
    caption,
    transcript,
    reply,
    draft,
    setDraft,
    notice,
    speechOn,
    unsupportedCopy: UNSUPPORTED,
    tab,
    setTab,
    closetTab,
    setClosetTab,
    suggestions: SUGGESTIONS,
    svgRef,
    submitText,
    wear,
    removeWorn,
    wearLook,
    deleteLook,
    toggleSpeak,
    startListen,
    stopListen,
    setGender,
    exportPng,
  }
}
