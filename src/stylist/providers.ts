import type { Intent } from '../nlu/parser'
import { isColor } from '../palette'
import type { Gender, Outfit, Slot, Style } from '../types'
import { SLOT_ORDER } from '../types'
import { garmentById } from '../wardrobe/catalog'
import {
  applyParsed,
  initialSession,
  localInterpret,
  type Session,
  type Turn,
  type TurnAction,
} from './apply'

export interface StylistContext {
  gender: Gender
  outfit: Outfit
  focus?: Slot
  lastStyle?: Style
}

export interface IntentProvider {
  readonly id: 'local-rules' | 'gateway'
  interpret(text: string, session: Session): Promise<Turn>
}

export function resolveProviderKind(api: string | undefined | null): 'local' | 'gateway' {
  return api && api.trim() ? 'gateway' : 'local'
}

export function toContext(session: Session): StylistContext {
  return {
    gender: session.gender,
    outfit: session.outfit,
    focus: session.focus,
    lastStyle: session.lastStyle,
  }
}

export function outfitFromUnknown(gender: Gender, raw: unknown): Outfit | null {
  if (!raw || typeof raw !== 'object') return null
  const slotsIn = (raw as { slots?: unknown }).slots
  if (!slotsIn || typeof slotsIn !== 'object') return null
  const slots: Outfit['slots'] = {}
  for (const [key, value] of Object.entries(slotsIn)) {
    if (!SLOT_ORDER.includes(key as Slot)) return null
    if (!value || typeof value !== 'object') return null
    const id = (value as { id?: unknown }).id
    const color = (value as { color?: unknown }).color
    if (typeof id !== 'string' || typeof color !== 'string') return null
    if (!garmentById(gender, id) || !isColor(color)) return null
    slots[key as Slot] = { id, color }
  }
  return { slots }
}

interface GatewayPayload {
  reply?: unknown
  action?: unknown
  outfit?: unknown
  gender?: unknown
  intent?: unknown
}

const ACTIONS: TurnAction[] = ['apply', 'save', 'undo', 'switch-gender', 'none']

export function turnFromGateway(session: Session, payload: unknown): Turn | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as GatewayPayload
  if (typeof body.reply !== 'string' || !body.reply.trim()) return null
  const action = ACTIONS.includes(body.action as TurnAction) ? (body.action as TurnAction) : null
  if (!action) return null
  const reply = body.reply.trim().slice(0, 200)
  const intent = (typeof body.intent === 'string' ? body.intent : 'recommend') as Intent

  if (action === 'save' || action === 'none' || action === 'undo') {
    if (action === 'undo') return applyParsed({ intent: 'undo', suggestions: [] }, session)
    return { intent, reply, session, action }
  }

  const gender = body.gender === 'male' || body.gender === 'female' ? body.gender : session.gender
  const outfit = outfitFromUnknown(gender, body.outfit)
  if (!outfit) return null
  return {
    intent,
    reply,
    action,
    session: {
      gender,
      outfit,
      focus: session.focus,
      lastStyle: session.lastStyle,
      past: [...session.past, { gender: session.gender, outfit: session.outfit, focus: session.focus, lastStyle: session.lastStyle }].slice(-20),
    },
  }
}

export class LocalRuleProvider implements IntentProvider {
  readonly id = 'local-rules' as const
  interpret(text: string, session: Session): Promise<Turn> {
    return Promise.resolve(localInterpret(text, session))
  }
}

export class GatewayProvider implements IntentProvider {
  readonly id = 'gateway' as const
  constructor(
    private readonly endpoint: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async interpret(text: string, session: Session): Promise<Turn> {
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text, context: toContext(session) }),
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(String(response.status))
      const payload: unknown = await response.json()
      const turn = turnFromGateway(session, payload)
      if (!turn) throw new Error('invalid stylist payload')
      return turn
    } catch {
      return localInterpret(text, session)
    }
  }
}

export function createIntentProvider(api = import.meta.env.VITE_STYLIST_API, fetchImpl?: typeof fetch): IntentProvider {
  const kind = resolveProviderKind(api)
  if (kind === 'gateway' && api) return new GatewayProvider(api.trim(), fetchImpl)
  return new LocalRuleProvider()
}

export { initialSession }
