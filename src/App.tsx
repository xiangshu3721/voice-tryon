import { useRef } from 'react'
import { FigureSvg } from './render/FigureSvg'
import { ACTIVE_TRYON_RENDERER, PhotoTryOnRenderer } from './render/PhotoTryOnRenderer'
import { useStudio } from './hooks/useStudio'
import { colorHex } from './palette'
import type { DrawSpec } from './render/specs'
import { DRAWS } from './render/specs'
import { CLOSET_TABS, closetTab, garmentsFor } from './wardrobe/catalog'
import { outfitSummary, wornLines } from './wardrobe/view'
import { formatWhen, type SavedLook } from './storage/looks'

export interface AppProps {
  /** 回到摄像头镜子模式（支持摄像头时才有） */
  onMirror?: () => void
  /** 为什么现在是插画模式 */
  notice?: string
}

export default function App({ onMirror, notice }: AppProps = {}) {
  const studio = useStudio()
  const { session } = studio
  const lines = wornLines(session.gender, session.outfit)
  const summary = outfitSummary(session.outfit)
  const items = garmentsFor(session.gender).filter((item) => closetTab(item) === studio.closetTab)
  const hold = useRef({ at: 0, listening: false })

  return (
    <div className="app" data-gender={session.gender}>
      <header className="topbar">
        <div className="brand">
          <h1>言衣</h1>
          <p>说一句，换一身</p>
        </div>
        <div className="top-actions">
          <div className="segment" role="group" aria-label="模特">
            <button type="button" data-testid="gender-female" aria-pressed={session.gender === 'female'} onClick={() => studio.setGender('female')}>
              女装
            </button>
            <button type="button" data-testid="gender-male" aria-pressed={session.gender === 'male'} onClick={() => studio.setGender('male')}>
              男装
            </button>
          </div>
          <button type="button" className="quiet" aria-pressed={studio.speakReplies} onClick={studio.toggleSpeak}>
            {studio.speakReplies ? '朗读开' : '朗读关'}
          </button>
          {onMirror && (
            <button type="button" className="quiet" data-testid="to-mirror" onClick={onMirror}>
              镜子模式
            </button>
          )}
        </div>
      </header>
      {notice && (
        <p className="mode-notice" role="status" data-testid="mode-notice">
          {notice}
        </p>
      )}

      <main className="workspace">
        <section className={`stage-wrap ${studio.phase === 'listening' ? 'is-listening' : ''}`} aria-label="模特预览">
          <div className="stage" data-testid="stage" data-outfit={summary}>
            {ACTIVE_TRYON_RENDERER === 'photo-ai' ? (
              <PhotoTryOnRenderer gender={session.gender} outfit={session.outfit} />
            ) : (
              <FigureSvg ref={studio.svgRef} gender={session.gender} outfit={session.outfit} />
            )}
            <div className="scrim" />
            <p className={`caption ${studio.phase === 'idle' && !studio.transcript ? 'hint' : ''}`} data-testid="caption" aria-live="polite">
              {studio.caption}
            </p>
            {studio.phase === 'thinking' && <p className="phase-note">在想这一身…</p>}
            {studio.phase === 'listening' && <p className="phase-note">正在听</p>}
          </div>
        </section>

        <aside className="panel">
          <div className="exchange">
            <p>
              <span>你说</span>
              <strong data-testid="transcript">{studio.transcript || '还没有'}</strong>
            </p>
            <p>
              <span>搭配师</span>
              <strong data-testid="reply">{studio.reply}</strong>
            </p>
          </div>

          <div className="tabs" role="tablist" aria-label="衣橱和搭配">
            <button type="button" role="tab" aria-selected={studio.tab === 'closet'} data-testid="tab-wardrobe" onClick={() => studio.setTab('closet')}>
              衣橱
            </button>
            <button type="button" role="tab" aria-selected={studio.tab === 'wearing'} data-testid="tab-wearing" onClick={() => studio.setTab('wearing')}>
              这一身
            </button>
            <button type="button" role="tab" aria-selected={studio.tab === 'saved'} data-testid="tab-saved" onClick={() => studio.setTab('saved')}>
              我的搭配
            </button>
          </div>

          <div className={`section ${studio.tab === 'closet' ? 'active' : ''}`} data-testid="wardrobe">
            <div className="subtabs" role="tablist" aria-label="衣橱分类">
              {CLOSET_TABS.map((tab) => (
                <button key={tab.id} type="button" aria-selected={studio.closetTab === tab.id} onClick={() => studio.setClosetTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>
            {items.length === 0 ? (
              <p className="empty">
                男装这边没有裙子。
                <button type="button" className="link" onClick={() => studio.setGender('female')}>
                  看看女装
                </button>
              </p>
            ) : (
              <div className="grid">
                {items.map((item) => {
                  const worn = session.outfit.slots[item.slot]
                  const on = worn?.id === item.id
                  const color = colorHex(on && worn ? worn.color : item.defaultColor)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`tile ${on ? 'on' : ''}`}
                      aria-pressed={on}
                      onClick={() => studio.wear(item.id)}
                    >
                      <Glyph spec={DRAWS[item.id]} color={color} />
                      <span>{item.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className={`section ${studio.tab === 'wearing' ? 'active' : ''}`}>
            <div className="section-head">
              <h2>这一身</h2>
              <div>
                <button type="button" className="quiet" onClick={() => void studio.submitText('保存这套')}>
                  保存这套
                </button>
                <button type="button" className="quiet" data-testid="export-png" onClick={() => void studio.exportPng()}>
                  保存图片
                </button>
              </div>
            </div>
            {lines.length === 0 ? (
              <p className="empty">还没穿上。点一件，或说「来套休闲」。</p>
            ) : (
              <ul className="wearing" data-testid="item-list">
                {lines.map((line) => (
                  <li key={line.slot}>
                    <i style={{ background: colorHex(session.outfit.slots[line.slot]!.color) }} />
                    <span>{line.label}</span>
                    <button type="button" onClick={() => studio.removeWorn(line.slot)}>
                      脱掉
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`section ${studio.tab === 'saved' ? 'active' : ''}`} data-testid="saved-list">
            <h2>我的搭配</h2>
            {studio.looks.length === 0 ? (
              <p className="empty">还没有保存的搭配。搭好了说「保存这套」。</p>
            ) : (
              <ul className="saved">
                {studio.looks.map((look) => (
                  <SavedCard key={look.id} look={look} when={formatWhen(look.createdAt)} onWear={() => studio.wearLook(look)} onDelete={() => studio.deleteLook(look.id)} />
                ))}
              </ul>
            )}
          </div>
          <p className="footnote">搭配只留在这台设备上。</p>
        </aside>
      </main>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          void studio.submitText(studio.draft)
        }}
      >
        {!studio.speechOn && (
          <p className="banner" data-testid="speech-banner" role="status">
            {studio.unsupportedCopy}
          </p>
        )}
        {studio.notice && (
          <p className="banner" role="status">
            {studio.notice}
          </p>
        )}
        <div className="chips">
          {studio.suggestions.map((text) => (
            <button key={text} type="button" className="chip" onClick={() => void studio.submitText(text)}>
              {text}
            </button>
          ))}
        </div>
        <div className="entry">
          <label className="sr-only" htmlFor="ask">
            说说想穿什么
          </label>
          <input
            id="ask"
            data-testid="composer-input"
            value={studio.draft}
            placeholder="说说想穿什么"
            enterKeyHint="send"
            autoComplete="off"
            onChange={(event) => studio.setDraft(event.target.value)}
          />
          <button type="submit" data-testid="send" disabled={studio.phase === 'thinking'}>
            换上
          </button>
          <button
            type="button"
            className={`mic ${studio.phase === 'listening' ? 'live' : ''}`}
            data-testid="mic-button"
            aria-label="按住说话，点一下开始或结束"
            aria-pressed={studio.phase === 'listening'}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              hold.current = { at: Date.now(), listening: studio.phase === 'listening' }
              if (studio.phase !== 'listening') studio.startListen()
            }}
            onPointerUp={() => {
              const held = Date.now() - hold.current.at
              if (hold.current.listening && held < 280) studio.stopListen()
              else if (!hold.current.listening && held >= 280) studio.stopListen()
            }}
            onPointerCancel={() => studio.stopListen()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (studio.phase === 'listening') studio.stopListen()
                else studio.startListen()
              }
            }}
          >
            <MicIcon />
          </button>
        </div>
      </form>
    </div>
  )
}

function SavedCard({
  look,
  when,
  onWear,
  onDelete,
}: {
  look: SavedLook
  when: string
  onWear: () => void
  onDelete: () => void
}) {
  return (
    <li>
      <div className="thumb" aria-hidden="true">
        <FigureSvg gender={look.gender} outfit={look.outfit} title="" />
      </div>
      <div className="saved-copy">
        <strong>{look.name}</strong>
        <span>{when}</span>
        <div>
          <button type="button" onClick={onWear}>
            穿上
          </button>
          <button type="button" onClick={onDelete}>
            删除
          </button>
        </div>
      </div>
    </li>
  )
}

function Glyph({ spec, color }: { spec: DrawSpec | undefined; color: string }) {
  const common = { fill: color, stroke: 'rgba(31,26,23,0.25)', strokeWidth: 1.2 }
  let d = 'M22 18 h20 l-2 28 h-16 Z'
  if (spec?.kind === 'bottom' && (spec.style === 'skirt' || spec.style === 'pleat')) d = 'M24 16 h16 l8 32 h-32 Z'
  else if (spec?.kind === 'bottom') d = 'M22 14 h8 l-2 34 h-8 Z M34 14 h8 l6 34 h-8 Z'
  else if (spec?.kind === 'dress') d = 'M24 12 h16 l2 10 l8 30 h-36 l8-30 Z'
  else if (spec?.kind === 'outer' || spec?.kind === 'coat') d = 'M16 18 l10-6 h12 l10 6 v30 h-8 V28 h-16 v20 h-8 Z'
  else if (spec?.kind === 'shoes') d = 'M14 36 h28 l6 8 h-38 Z'
  else if (spec?.kind === 'hat') d = 'M18 34 h28 v-6 c0-10-6-16-14-16 s-14 6-14 16 Z'
  else if (spec?.kind === 'neck') d = 'M24 16 h16 l-2 28 h-12 Z'
  else if (spec?.kind === 'bag') d = 'M22 20 h20 l2 24 h-24 Z'
  else if (spec?.kind === 'glasses') d = 'M14 28 h14 v8 h-14 Z M36 28 h14 v8 h-14 Z'
  else if (spec?.kind === 'belt') d = 'M12 30 h40 v6 h-40 Z'
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={d} {...common} />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11 a6 6 0 0 0 12 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 17 v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
