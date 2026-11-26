import fs from 'node:fs'
import path from 'node:path'
import { File } from 'megajs'
import { config } from '../config.js'
import { log } from './store.js'

function decodeSession(value) {
  const clean = String(value || '').trim().replace(/^RISUU_SESSION~/i, '')
  if (!clean) return null
  if (clean.startsWith('{')) return Buffer.from(clean)
  try {
    const decoded = Buffer.from(clean, 'base64')
    if (decoded.toString('utf8').trim().startsWith('{')) return decoded
  } catch { /* not base64 */ }
  return null
}

export async function restoreSession() {
  const credsPath = path.join(config.authDir, 'creds.json')
  if (fs.existsSync(credsPath) || !config.sessionId) return false
  fs.mkdirSync(config.authDir, { recursive: true })

  let data = decodeSession(config.sessionId)
  if (!data) {
    const megaUrl = config.sessionId.startsWith('https://mega.nz/') ? config.sessionId : `https://mega.nz/file/${config.sessionId.replace(/^MEGA~/i, '')}`
    log('info', 'Restoring saved WhatsApp session...')
    data = await new Promise((resolve, reject) => {
      try {
        File.fromURL(megaUrl).download((error, buffer) => error ? reject(error) : resolve(buffer))
      } catch (error) { reject(error) }
    })
  }

  const parsed = JSON.parse(data.toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || !parsed.noiseKey) throw new Error('SESSION_ID did not contain valid Baileys credentials')
  fs.writeFileSync(credsPath, JSON.stringify(parsed))
  log('ok', 'Saved session restored')
  return true
}

export function clearSession() {
  fs.rmSync(config.authDir, { recursive: true, force: true })
}
