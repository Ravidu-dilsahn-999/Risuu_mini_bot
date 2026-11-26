import { EventEmitter } from 'node:events'
import { config } from '../config.js'

export const bus = new EventEmitter()
bus.setMaxListeners(100)

export const state = {
  status: 'booting',
  connected: false,
  qr: null,
  pairCode: null,
  pairNumber: config.pairNumber || null,
  botNumber: null,
  waVersion: null,
  startedAt: Date.now(),
  connectedAt: null,
  lastError: null,
  messages: 0,
  commandRuns: 0,
  replies: 0,
  settings: {
    prefix: config.prefix,
    mode: config.mode,
    animations: config.animations,
    welcome: config.welcome,
    autoRead: config.autoRead,
    autoStatusRead: config.autoStatusRead
  },
  chats: [],
  logs: []
}

export function publicState() {
  return {
    status: state.status,
    connected: state.connected,
    qr: state.qr,
    pairCode: state.pairCode,
    pairNumber: state.pairNumber,
    botNumber: state.botNumber,
    waVersion: state.waVersion,
    startedAt: state.startedAt,
    connectedAt: state.connectedAt,
    lastError: state.lastError,
    messages: state.messages,
    commandRuns: state.commandRuns,
    replies: state.replies,
    uptime: Date.now() - state.startedAt,
    settings: { ...state.settings },
    logCount: state.logs.length
  }
}

export function publish() {
  bus.emit('change', publicState())
}

export function setStatus(status, extra = {}) {
  state.status = status
  Object.assign(state, extra)
  publish()
}

export function rememberChat(jid) {
  if (!jid || jid === 'status@broadcast' || state.chats.includes(jid)) return
  state.chats.push(jid)
  if (state.chats.length > 500) state.chats.shift()
}

export function log(level, message) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    level,
    message: String(message)
  }
  state.logs.unshift(entry)
  if (state.logs.length > 250) state.logs.length = 250
  bus.emit('log', entry)
  publish()
  const mark = { ok: '✓', warn: '!', error: '✕', chat: '↔', info: '•' }[level] || '•'
  console.log(`[RISUU] ${mark} ${entry.message}`)
}
