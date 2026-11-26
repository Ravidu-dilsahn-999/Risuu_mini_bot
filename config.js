import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: fs.existsSync(path.join(root, 'config.env')) ? path.join(root, 'config.env') : path.join(root, '.env'), quiet: true })

const digits = (value = '') => String(value).replace(/\D/g, '')
const bool = (value, fallback = false) => value == null ? fallback : !['0', 'false', 'off', 'no'].includes(String(value).toLowerCase())
const requestedMode = String(process.env.MODE || 'public').toLowerCase()

export const config = {
  root,
  botName: process.env.BOT_NAME || 'RISUU MINI BOT',
  prefix: (process.env.PREFIX || '.').trim().slice(0, 3) || '.',
  ownerNumber: digits(process.env.OWNER_NUMBER || process.env.OWNER_NUM || ''),
  pairNumber: digits(process.env.PAIR_NUMBER || process.env.OWNER_NUMBER || process.env.OWNER_NUM || ''),
  sessionId: String(process.env.SESSION_ID || '').trim(),
  mode: ['public', 'private', 'groups', 'inbox'].includes(requestedMode) ? requestedMode : 'public',
  port: Number(process.env.PORT || 8000),
  animations: bool(process.env.ANIMATIONS, true),
  welcome: bool(process.env.WELCOME, true),
  autoRead: bool(process.env.AUTO_READ, false),
  autoStatusRead: bool(process.env.AUTO_STATUS_READ, false),
  selfCommands: bool(process.env.SELF_COMMANDS, true),
  demo: process.argv.includes('--demo') || bool(process.env.DEMO_MODE, false),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  maxDownloadMb: Math.max(5, Math.min(100, Number(process.env.MAX_DOWNLOAD_MB || 45))),
  authDir: path.join(root, 'auth_info_baileys'),
  publicDir: path.join(root, 'public')
}
