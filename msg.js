import pino from 'pino'
import { downloadMediaMessage, getContentType, proto } from '@whiskeysockets/baileys'
import { normalizeJid, senderJid } from './functions.js'

const logger = pino({ level: 'silent' })
const wrappers = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage', 'deviceSentMessage']

export function unwrapMessage(message = {}) {
  let current = message || {}
  for (let i = 0; i < 6; i++) {
    const wrapper = wrappers.find((key) => current?.[key]?.message)
    if (!wrapper) break
    current = current[wrapper].message
  }
  if (current?.protocolMessage?.editedMessage) current = current.protocolMessage.editedMessage
  return current
}

export function extractText(message) {
  const content = unwrapMessage(message?.message || {})
  return content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId || content.listResponseMessage?.singleSelectReply?.selectedRowId || content.templateButtonReplyMessage?.selectedId || ''
}

export function quotedMessage(message) {
  const content = unwrapMessage(message?.message || {})
  const type = getContentType(content)
  const context = type ? content[type]?.contextInfo : null
  if (!context?.quotedMessage) return null
  return proto.WebMessageInfo.fromObject({
    key: {
      remoteJid: message.key.remoteJid,
      id: context.stanzaId,
      participant: context.participant,
      fromMe: Boolean(context.participant && normalizeJid(context.participant) === normalizeJid(message.key.participant))
    },
    message: context.quotedMessage
  })
}

export async function downloadMessageMedia(sock, message) {
  const target = quotedMessage(message) || message
  if (!target?.message) throw new Error('Reply to an image/sticker/media message')
  return downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage })
}

export function serializeMessage(sock, message) {
  const content = unwrapMessage(message.message || {})
  const type = getContentType(content)
  const data = type ? content[type] : null
  const sender = senderJid(message)
  return {
    raw: message,
    key: message.key,
    id: message.key?.id,
    chat: message.key?.remoteJid,
    fromMe: Boolean(message.key?.fromMe),
    sender,
    pushName: message.pushName || 'Friend',
    isGroup: message.key?.remoteJid?.endsWith('@g.us') || false,
    type,
    data,
    text: extractText(message).trim(),
    mentions: data?.contextInfo?.mentionedJid || [],
    quoted: quotedMessage(message),
    react: (emoji) => sock.sendMessage(message.key.remoteJid, { react: { text: emoji, key: message.key } }),
    download: () => downloadMessageMedia(sock, message)
  }
}
