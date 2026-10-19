import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Gender } from '../types'
import type { Category } from './fit'
import { MirrorStage, preloadGarments, type MirrorStageHandle } from './MirrorStage'
import { interpretMirror, MIRROR_SUGGESTIONS, MIRROR_SUGGESTIONS_MALE } from './search'
import { initialMirror, layers, switchGender, takeOff, toggle, wearLook, wornLines, type MirrorSession, type Worn } from './session'
import { useVoice } from './useVoice'
import { CATEGORY_LABEL, CATEGORY_ORDER, garmentsOf, imageUrl, STYLES } from './wardrobe'

const KEY = 'yanyi.mirror.v1'

function load(): MirrorSession {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as { gender?: Gender; worn?: Worn }
      const gender: Gender = v.gender === 'male' ? 'male' : 'female'
      const s = initialMirror(gender)
      const ids = new Set(garmentsOf(gender).map((g) => g.id))
      const worn: Worn = {}
      for (const [cat, id] of Object.entries(v.worn ?? {})) if (id && ids.has(id)) worn[cat as Category] = id
      return { ...s, worn }
    }
  } catch {
    /* ignore */
  }
  // 第一次来：先穿一套，让人一入镜就看到效果
  return wearLook(initialMirror('female'), STYLES.female[0].id)
}

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

interface Props {
  onUseIllustration: () => void
}

export function MirrorApp({ onUseIllustration }: Props) {
  const [session, setSession] = useState<MirrorSession>(load)
  const [heard, setHeard] = useState('')
  const [reply, setReply] = useState('说一句，或点衣柜里的衣服。')
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<Category>('outer')
  const [style, setStyle] = useState<string>('all')
  const [flash, setFlash] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const stage = useRef<MirrorStageHandle>(null)
  const autoStart = useMemo(() => {
    try {
      return localStorage.getItem('yanyi.camera.ok') === '1'
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ gender: session.gender, worn: session.worn }))
    } catch {
      /* ignore */
    }
  }, [session.gender, session.worn])

  const all = useMemo(() => garmentsOf(session.gender), [session.gender])
  useEffect(() => preloadGarments(all), [all])
  const worn = useMemo(() => layers(session.worn), [session.worn])
  const lines = wornLines(session)
  const styles = STYLES[session.gender]
  const tabs = CATEGORY_ORDER.filter((c) => all.some((g) => g.category === c))
  const items = all.filter((g) => g.category === tab && (style === 'all' || g.style === style))

  const takePhoto = useCallback(async () => {
    const blob = await stage.current?.snapshot()
    if (!blob) {
      setPhotoMsg('镜子还没打开，拍不了。')
      return
    }
    setFlash(true)
    window.setTimeout(() => setFlash(false), 260)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yanyi-${stamp()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    setPhotoMsg('照片已存到本机下载里。')
  }, [])

  const say = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      setHeard(t)
      setSession((s) => {
        const turn = interpretMirror(t, s)
        setReply(turn.reply)
        if (turn.effect === 'photo') window.setTimeout(() => void takePhoto(), 0)
        const focus = turn.session.focus
        if (focus && turn.intent !== 'remove') setTab(focus)
        if (turn.session.gender !== s.gender) setStyle('all')
        return turn.session
      })
    },
    [takePhoto],
  )

  const voice = useVoice(say)

  const setGender = (g: Gender) => {
    if (g === session.gender) return
    setStyle('all')
    setSession((s) => wearLook(switchGender(s, g), STYLES[g][0].id))
    setReply(g === 'male' ? '换到男装衣柜。' : '换到女装衣柜。')
  }

  const pickStyle = (id: string) => {
    setStyle(id)
    if (id === 'all') return
    setSession((s) => wearLook(s, id))
    const name = styles.find((x) => x.id === id)?.name ?? ''
    setHeard('')
    setReply(`来一套${name}。`)
  }

  const suggestions = session.gender === 'male' ? MIRROR_SUGGESTIONS_MALE : MIRROR_SUGGESTIONS

  return (
    <div className="mirror-app" data-gender={session.gender}>
      <header className="topbar">
        <div className="brand">
          <h1>言衣</h1>
          <p>说一句，换一身</p>
        </div>
        <div className="top-actions">
          <div className="segment" role="group" aria-label="衣柜">
            <button type="button" data-testid="gender-female" aria-pressed={session.gender === 'female'} onClick={() => setGender('female')}>
              女装
            </button>
            <button type="button" data-testid="gender-male" aria-pressed={session.gender === 'male'} onClick={() => setGender('male')}>
              男装
            </button>
          </div>
          <button type="button" className="quiet" data-testid="to-illustration" onClick={onUseIllustration}>
            插画模式
          </button>
        </div>
      </header>

      <main className="mirror-ws">
        <section className={`mirror-stage ${flash ? 'flash' : ''}`} aria-label="镜子">
          <MirrorStage ref={stage} garments={worn} onUseIllustration={onUseIllustration} autoStart={autoStart} />
          <div className="stage-foot">
            <p className="stage-caption" data-testid="stage-caption">
              {lines.length ? lines.map((l) => l.garment.name).join(' · ') : '还没穿衣服'}
            </p>
            <button type="button" className="shutter" data-testid="shutter" aria-label="拍照保存" onClick={() => void takePhoto()}>
              <span />
            </button>
          </div>
        </section>

        <aside className="mirror-panel">
          <section className="exchange" aria-live="polite">
            <p className="said">
              <span className="who">你说</span>
              <span data-testid="heard">{voice.phase === 'listening' ? voice.interim || '在听…' : heard || '——'}</span>
            </p>
            <p className="reply">
              <span className="who seal">衣</span>
              <span data-testid="reply">{reply}</span>
            </p>
            {(voice.notice || photoMsg) && <p className="notice">{voice.notice || photoMsg}</p>}
          </section>

          <section className="closet" aria-label="衣柜">
            <div className="style-row" role="group" aria-label="风格">
              <button type="button" className="chip" aria-pressed={style === 'all'} onClick={() => pickStyle('all')}>
                全部
              </button>
              {styles.map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={style === s.id} title={s.source} data-testid={`style-${s.id}`} onClick={() => pickStyle(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
            <div className="closet-tabs" role="tablist">
              {tabs.map((c) => (
                <button key={c} type="button" role="tab" aria-selected={tab === c} onClick={() => setTab(c)}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            <div className="garment-grid" data-testid="garment-grid">
              {items.map((g) => {
                const on = session.worn[g.category] === g.id
                return (
                  <button key={g.id} type="button" className={`garment-tile ${on ? 'on' : ''}`} aria-pressed={on} data-testid={`tile-${g.id}`} onClick={() => setSession((s) => toggle(s, g.id))}>
                    <img src={imageUrl(g)} alt="" loading="lazy" />
                    <span>{g.name}</span>
                  </button>
                )
              })}
              {!items.length && <p className="empty">这个风格里没有{CATEGORY_LABEL[tab]}。</p>}
            </div>
          </section>

          <section className="outfit" aria-label="这一身">
            <h2>这一身</h2>
            {lines.length ? (
              <ul data-testid="outfit-list">
                {lines.map((l) => (
                  <li key={l.category}>
                    <img src={imageUrl(l.garment)} alt="" />
                    <div>
                      <strong>{l.garment.name}</strong>
                      <small>
                        {CATEGORY_LABEL[l.category]} · {l.styleName} · {l.garment.colorName}
                      </small>
                    </div>
                    <button type="button" className="quiet" onClick={() => setSession((s) => takeOff(s, l.category))}>
                      脱掉
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">还空着。说「试试新中式」或点上面的衣服。</p>
            )}
          </section>
        </aside>
      </main>

      <form
        className="composer mirror-composer"
        onSubmit={(e) => {
          e.preventDefault()
          say(draft)
          setDraft('')
        }}
      >
        <div className="chips">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => say(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="composer-row">
          <input data-testid="composer-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="比如：换件老钱风的外套" enterKeyHint="send" />
          <button type="submit" className="send">
            换上
          </button>
          <button
            type="button"
            className={`mic ${voice.phase === 'listening' ? 'live' : ''}`}
            data-testid="mic-button"
            aria-label={voice.phase === 'listening' ? '停止' : '说话'}
            aria-pressed={voice.phase === 'listening'}
            onClick={() => (voice.phase === 'listening' ? voice.stop() : voice.start())}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
