/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STYLIST_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

interface SpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: BrowserSpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface BrowserSpeechResultEvent {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}
