import crypto from 'node:crypto'
import { config } from '../config.js'
import { state } from './store.js'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const stripNonDigits = (value = '') => String(value).replace(/\D/g, '')
export const normalizeJid = (jid = '') => {
  if (!jid || !String(jid).includes('@')) return String(jid || '')
  const [user, server] = String(jid).split('@')
  return `${user.split(':')[0]}@${server}`
}
export const isGroupJid = (jid = '') => String(jid).endsWith('@g.us')
export const isPnJid = (jid = '') => String(jid).endsWith('@s.whatsapp.net')
export const pick = (items) => items[Math.floor(Math.random() * items.length)]
export const getRandom = (ext = '') => `${crypto.randomInt(1000, 10000)}${ext}`
export const Json = (value) => JSON.stringify(value, null, 2)
export const isUrl = (value = '') => /^https?:\/\/[^\s]+$/i.test(String(value))

export function senderJids(message) {
  const key = message?.key || {}
  const values = [key.participantAlt, key.participant, key.remoteJidAlt, key.remoteJid]
    .filter(Boolean).map(normalizeJid).filter((jid) => !isGroupJid(jid))
  return [...new Set([...values.filter(isPnJid), ...values.filter((jid) => !isPnJid(jid))])]
}

export function senderJid(message) {
  return senderJids(message)[0] || ''
}

export function isOwner(message) {
  if (message?.key?.fromMe) return true
  if (!config.ownerNumber) return false
  return senderJids(message).some((jid) => isPnJid(jid) && stripNonDigits(jid.split('@')[0]).endsWith(config.ownerNumber))
}

export function formatUptime(ms = Date.now() - state.startedAt) {
  let seconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(seconds / 86400); seconds %= 86400
  const hours = Math.floor(seconds / 3600); seconds %= 3600
  const minutes = Math.floor(seconds / 60); seconds %= 60
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds}s`
}

export const runtime = (seconds) => formatUptime(Number(seconds) * 1000)

export function h2k(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || Math.abs(number) < 1000) return String(value)
  const units = ['', 'K', 'M', 'B', 'T']
  const unit = Math.min(units.length - 1, Math.floor(Math.log10(Math.abs(number)) / 3))
  return `${(number / 1000 ** unit).toFixed(1).replace(/\.0$/, '')}${units[unit]}`
}

export async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || 15_000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { 'User-Agent': 'RISUU-MINI-BOT/2.0', ...(options.headers || {}) } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`)
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function getBuffer(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || 30_000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`)
    return Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

export async function streamToBuffer(stream, maxBytes = config.maxDownloadMb * 1024 * 1024) {
  const chunks = []
  let total = 0
  for await (const chunk of stream) {
    total += chunk.length
    if (total > maxBytes) {
      stream.destroy?.()
      throw new Error(`File is larger than ${config.maxDownloadMb} MB`)
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function calc(expression) {
  const source = String(expression).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim()
  if (!source || !/^[\d\s+\-*/().%^]+$/.test(source)) throw new Error('Invalid math expression')
  const tokens = source.match(/\d+\.?\d*|[+\-*/%^()]/g)
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 }
  const output = []
  const operators = []
  for (const token of tokens || []) {
    if (/^\d/.test(token)) output.push(Number(token))
    else if (token === '(') operators.push(token)
    else if (token === ')') {
      while (operators.length && operators.at(-1) !== '(') output.push(operators.pop())
      if (operators.pop() !== '(') throw new Error('Mismatched brackets')
    } else {
      while (operators.length && operators.at(-1) !== '(' && (precedence[operators.at(-1)] || 0) >= precedence[token]) output.push(operators.pop())
      operators.push(token)
    }
  }
  while (operators.length) output.push(operators.pop())
  const stack = []
  for (const token of output) {
    if (typeof token === 'number') stack.push(token)
    else {
      const b = stack.pop(); const a = stack.pop()
      if (a == null || b == null) throw new Error('Invalid math expression')
      stack.push(({ '+': () => a + b, '-': () => a - b, '*': () => a * b, '/': () => a / b, '%': () => a % b, '^': () => a ** b })[token]())
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Calculation failed')
  return Math.round(stack[0] * 1e8) / 1e8
}

const groupCache = new Map()
export async function groupMetadata(sock, jid, fresh = false) {
  const cached = groupCache.get(jid)
  if (!fresh && cached && Date.now() - cached.at < 5 * 60_000) return cached.value
  const value = await sock.groupMetadata(jid)
  groupCache.set(jid, { at: Date.now(), value })
  return value
}
export const cachedGroupMetadata = (jid) => {
  const cached = groupCache.get(jid)
  return cached && Date.now() - cached.at < 5 * 60_000 ? cached.value : undefined
}
export const invalidateGroup = (jid) => jid ? groupCache.delete(jid) : groupCache.clear()
export const getGroupAdmins = (participants = []) => participants.filter((item) => item.admin || item.isAdmin || item.isSuperAdmin).map((item) => item.id)

export async function animateReply(sock, jid, text, quoted, category = 'core', mentions = [], mock = false) {
  const finalText = String(text ?? '').slice(0, 3900)
  state.replies++
  if (mock || !state.settings.animations) return sock.sendMessage(jid, { text: finalText, ...(mentions.length ? { mentions } : {}) }, quoted ? { quoted } : undefined)

  const marks = { core: '◈', utility: '⌁', text: '✎', fun: '✦', media: '⬡', group: '◉', owner: '◆' }
  const mark = marks[category] || '◇'
  const frames = [
    `${mark} *${config.botName}*\n▱▱▱▱▱▱▱▱  preparing...`,
    `${mark} *${config.botName}*\n▰▰▰▰▰▱▱▱  rendering...`,
    finalText
  ]
  try {
    const sent = await sock.sendMessage(jid, { text: frames[0] }, quoted ? { quoted } : undefined)
    await sleep(180)
    await sock.sendMessage(jid, { text: frames[1], edit: sent.key })
    await sleep(180)
    await sock.sendMessage(jid, { text: frames[2], edit: sent.key, ...(mentions.length ? { mentions } : {}) })
    return sent
  } catch {
    return sock.sendMessage(jid, { text: finalText, ...(mentions.length ? { mentions } : {}) }, quoted ? { quoted } : undefined)
  }
}
