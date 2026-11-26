import fs from 'node:fs'
import pino from 'pino'
import QRCode from 'qrcode'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { config } from '../config.js'
import { handleMessage } from './engine.js'
import { animateReply, cachedGroupMetadata, invalidateGroup, normalizeJid, stripNonDigits } from './functions.js'
import { clearSession, restoreSession } from './session.js'
import { log, publish, setStatus, state } from './store.js'

export let sock = null
let starting = false
let pendingPair = null
let reconnectTimer = null
let reconnectAttempts = 0
const logger = pino({ level: 'silent' })
const sentMessages = new Map()

async function resolveVersion() {
  for (const [source, resolver] of [['whatsapp-web', fetchLatestWaWebVersion], ['baileys', fetchLatestBaileysVersion]]) {
    try {
      const result = await resolver()
      if (result?.version && result.isLatest) return { version: result.version, source }
    } catch { /* use next source */ }
  }
  return { version: undefined, source: 'bundled' }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer)
  const delay = Math.min(60_000, 3000 * 2 ** Math.min(reconnectAttempts++, 4))
  reconnectTimer = setTimeout(() => startBot().catch((error) => log('error', error?.message || error)), delay)
  return delay
}

function rememberSent(message) {
  if (!message?.key?.id || !message.message) return
  sentMessages.set(message.key.id, message.message)
  if (sentMessages.size > 300) sentMessages.delete(sentMessages.keys().next().value)
}

export async function startBot() {
  if (starting || sock) return sock
  starting = true
  clearTimeout(reconnectTimer)

  if (config.demo) {
    setStatus('demo', { connected: false, pairCode: 'RISU109X', pairNumber: config.pairNumber || '94700000000' })
    log('warn', 'Demo mode: WhatsApp connection skipped')
    starting = false
    return null
  }

  let current = null
  try {
    fs.mkdirSync(config.authDir, { recursive: true })
    try { await restoreSession() } catch (error) {
      log('warn', `SESSION_ID restore failed: ${error?.message || error}. Starting fresh pairing.`)
      clearSession()
      fs.mkdirSync(config.authDir, { recursive: true })
    }

    const { state: auth, saveCreds } = await useMultiFileAuthState(config.authDir)
    const { version, source } = await resolveVersion()
    state.waVersion = version?.join('.') || 'bundled'
    log('info', `WhatsApp Web ${state.waVersion} (${source})`)

    current = makeWASocket({
      ...(version && { version }),
      auth: { creds: auth.creds, keys: makeCacheableSignalKeyStore(auth.keys, logger) },
      browser: Browsers.ubuntu('Chrome'),
      logger,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
      cachedGroupMetadata: async (jid) => cachedGroupMetadata(jid),
      getMessage: async (key) => sentMessages.get(key?.id)
    })
    sock = current
    const isCurrent = () => sock === current

    current.ev.on('creds.update', saveCreds)
    current.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const message of messages || []) if (message?.key?.fromMe) rememberSent(message)
      if (type !== 'notify' || !isCurrent()) return
      for (const message of messages || []) {
        try { await handleMessage(current, message) } catch (error) { log('error', `Message handler: ${error?.message || error}`) }
      }
    })

    current.ev.on('group-participants.update', async (update) => {
      invalidateGroup(update.id)
      if (!isCurrent() || update.action !== 'add' || !state.settings.welcome) return
      const mentions = (update.participants || []).map((p) => normalizeJid(typeof p === 'string' ? p : p.id || p.phoneNumber || p.lid || '')).filter(Boolean)
      if (!mentions.length) return
      const names = mentions.map((jid) => `@${stripNonDigits(jid.split('@')[0])}`).join(' ')
      await animateReply(current, update.id, `╭─❖ *WELCOME TO THE GROUP* ❖─╮\n\n${names}\n\n✨ ${config.botName} ඔයාව සාදරයෙන් පිළිගන්නවා!\n${state.settings.prefix}menu ගහලා commands 109 බලන්න.\n\n╰──────────────────╯`, null, 'group', mentions).catch(() => {})
    })
    current.ev.on('groups.update', (updates) => (updates || []).forEach((item) => invalidateGroup(item.id)))

    current.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (!isCurrent()) return

      if (qr) {
        try {
          state.qr = await QRCode.toDataURL(qr, { width: 440, margin: 1 })
          setStatus('waiting_for_scan', { lastError: null })
          log('info', 'QR ready on dashboard')
        } catch { /* pairing code can still be used */ }

        if (pendingPair && !current.authState?.creds?.registered) {
          const number = pendingPair
          pendingPair = null
          try {
            const code = await current.requestPairingCode(number)
            state.qr = null
            setStatus('waiting_for_scan', { pairCode: code, pairNumber: number, lastError: null })
            log('ok', `Pairing code ready: ${code}`)
          } catch (error) { log('warn', `Pairing code: ${error?.message || error}`) }
        }
      }

      if (connection === 'open') {
        reconnectAttempts = 0
        const number = stripNonDigits(current.user?.id?.split('@')[0]?.split(':')[0] || '')
        setStatus('connected', { connected: true, qr: null, pairCode: null, botNumber: number, connectedAt: Date.now(), lastError: null })
        log('ok', `${config.botName} connected${number ? ` (${number})` : ''}`)
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode
        const message = lastDisconnect?.error?.message || String(reason || 'unknown')
        sock = null
        starting = false
        state.connected = false
        state.qr = null

        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
          clearSession()
          setStatus('logged_out', { pairCode: null, lastError: reason === DisconnectReason.loggedOut ? 'Logged out' : 'Bad session cleared' })
          log('warn', 'Session cleared. Pair again from the dashboard.')
          setTimeout(() => startBot().catch(() => {}), 800)
          return
        }
        if (reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.forbidden) {
          setStatus('error', { lastError: message })
          log('error', `Connection stopped: ${message}`)
          return
        }
        const delay = reason === DisconnectReason.restartRequired ? 0 : scheduleReconnect()
        setStatus('reconnecting', { lastError: message })
        log('warn', `Disconnected (${reason || 'unknown'}), reconnecting${delay ? ` in ${Math.round(delay / 1000)}s` : ''}`)
        if (!delay) startBot().catch((error) => log('error', error?.message || error))
      }
    })

    return current
  } catch (error) {
    if (sock === current) sock = null
    setStatus('error', { connected: false, lastError: String(error?.message || error) })
    log('error', `Bot start: ${error?.message || error}`)
    scheduleReconnect()
    return null
  } finally {
    starting = false
  }
}

export async function requestPair(number) {
  const clean = stripNonDigits(number || config.pairNumber)
  if (clean.length < 8) throw new Error('Use country code, example: 94771234567')
  if (config.demo) {
    setStatus('demo', { pairCode: 'RISU109X', pairNumber: clean })
    return { code: 'RISU109X', demo: true }
  }
  if (!sock) {
    pendingPair = clean
    startBot().catch(() => {})
    return { code: null, pending: true }
  }
  if (sock.authState?.creds?.registered) return { code: null, alreadyRegistered: true }
  try {
    const code = await sock.requestPairingCode(clean)
    state.qr = null
    setStatus('waiting_for_scan', { pairCode: code, pairNumber: clean, lastError: null })
    return { code }
  } catch {
    pendingPair = clean
    return { code: null, pending: true }
  }
}

export async function sendToChat(jid, text) {
  if (!text?.trim()) throw new Error('Message is empty')
  if (config.demo) {
    log('chat', `DEMO → ${jid}: ${text}`)
    return { demo: true }
  }
  if (!sock || !state.connected) throw new Error('Bot is not connected')
  await sock.sendMessage(jid, { text })
  return { ok: true }
}

export function disconnect() {
  clearTimeout(reconnectTimer)
  const old = sock
  sock = null
  starting = false
  pendingPair = null
  try { old?.ws?.close() } catch { /* ignored */ }
}

export async function restartBot() {
  disconnect()
  await startBot()
}

export function getSocket() {
  return sock
}
