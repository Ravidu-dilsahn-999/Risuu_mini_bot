import { commands, getCommand } from '../command.js'
import { config } from '../config.js'
import { state, log, rememberChat } from './store.js'
import { animateReply, getGroupAdmins, groupMetadata, isGroupJid, isOwner, normalizeJid, senderJids, stripNonDigits } from './functions.js'
import { serializeMessage } from './msg.js'

function participantJids(participant) {
  return [participant?.id, participant?.phoneNumber, participant?.lid].filter(Boolean).map(normalizeJid)
}

function findParticipant(metadata, candidates) {
  return metadata?.participants?.find((participant) => participantJids(participant).some((jid) => candidates.includes(jid)))
}

function targetJids(m, args = []) {
  const values = [...(m.mentions || [])]
  const quotedSender = m.quoted?.key?.participant || m.quoted?.key?.remoteJid
  if (quotedSender && !isGroupJid(quotedSender)) values.push(quotedSender)
  const number = stripNonDigits(args[0] || '')
  if (number.length >= 8) values.push(`${number}@s.whatsapp.net`)
  return [...new Set(values.map(normalizeJid).filter(Boolean))]
}

async function buildContext(sock, raw, m, command, args, mock) {
  let metadata = null
  let senderAdmin = !m.isGroup
  let botAdmin = !m.isGroup

  if (m.isGroup) {
    try {
      metadata = await groupMetadata(sock, m.chat)
      const senderCandidates = raw.key?.fromMe
        ? [sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizeJid)
        : senderJids(raw)
      const botCandidates = [sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizeJid)
      const senderParticipant = findParticipant(metadata, senderCandidates)
      const botParticipant = findParticipant(metadata, botCandidates)
      senderAdmin = Boolean(senderParticipant?.admin || senderParticipant?.isAdmin || senderParticipant?.isSuperAdmin)
      botAdmin = Boolean(botParticipant?.admin || botParticipant?.isAdmin || botParticipant?.isSuperAdmin)
    } catch { /* permission checks below will return a useful response */ }
  }

  const owner = mock || isOwner(raw)
  return {
    sock,
    raw,
    m,
    command,
    args,
    q: args.join(' '),
    from: m.chat,
    isGroup: m.isGroup,
    isOwner: owner,
    isAdmin: mock || owner || senderAdmin,
    isBotAdmin: mock || botAdmin,
    groupMetadata: metadata,
    groupAdmins: getGroupAdmins(metadata?.participants),
    targets: targetJids(m, args),
    prefix: state.settings.prefix,
    mock,
    reply: (text, mentions = []) => animateReply(sock, m.chat, text, raw, command.category, mentions, mock),
    send: (content, options = {}) => sock.sendMessage(m.chat, content, { quoted: raw, ...options })
  }
}

export async function executeCommand(sock, raw, text, options = {}) {
  const mock = Boolean(options.mock)
  const m = serializeMessage(sock, raw)
  const prefix = state.settings.prefix || config.prefix
  if (!text.startsWith(prefix)) return { handled: false }
  const parts = text.slice(prefix.length).trim().split(/\s+/)
  const name = (parts.shift() || '').toLowerCase()
  const command = getCommand(name)
  if (!command) return { handled: false, unknown: name }
  const ctx = await buildContext(sock, raw, m, command, parts, mock)

  if (command.owner && !ctx.isOwner) {
    await ctx.reply('🔒 Owner command එකක්.')
    return { handled: true, denied: 'owner' }
  }
  if (command.group && !ctx.isGroup) {
    await ctx.reply('👥 මේ command එක group එකක විතරයි වැඩ කරන්නේ.')
    return { handled: true, denied: 'group' }
  }
  if (command.admin && !ctx.isAdmin) {
    await ctx.reply('🛡️ Group admin කෙනෙක්ට විතරයි මේ command එක භාවිතා කරන්න පුළුවන්.')
    return { handled: true, denied: 'admin' }
  }
  if (command.botAdmin && !ctx.isBotAdmin) {
    await ctx.reply('🤖 මේ වැඩේට bot එක group admin කරන්න.')
    return { handled: true, denied: 'bot-admin' }
  }

  if (!mock && command.react) m.react(command.react).catch(() => {})
  const started = Date.now()
  try {
    const result = await command.function(sock, raw, m, ctx)
    if (typeof result === 'string') await ctx.reply(result)
    else if (result?.text) await ctx.reply(result.text, result.mentions || [])
    if (!mock) {
      state.commandRuns++
      log('chat', `${prefix}${command.pattern} · ${Date.now() - started}ms`)
    }
    return { handled: true, command: command.pattern }
  } catch (error) {
    log('error', `${command.pattern}: ${error?.message || error}`)
    await ctx.reply(`⚠️ Command error\n${error?.message || error}`)
    return { handled: true, command: command.pattern, error: String(error?.message || error) }
  }
}

export async function handleMessage(sock, raw) {
  const jid = raw?.key?.remoteJid
  if (!jid || !raw.message) return

  if (jid === 'status@broadcast') {
    if (state.settings.autoStatusRead) await sock.readMessages([raw.key]).catch(() => {})
    return
  }
  if (jid.endsWith('@newsletter')) return

  const m = serializeMessage(sock, raw)
  if (!m.text) return
  const prefix = state.settings.prefix || config.prefix
  if (m.fromMe && (!config.selfCommands || !m.text.startsWith(prefix))) return

  const owner = isOwner(raw)
  if (!owner && state.settings.mode === 'private') return
  if (!owner && state.settings.mode === 'groups' && !m.isGroup) return
  if (!owner && state.settings.mode === 'inbox' && m.isGroup) return

  state.messages++
  rememberChat(jid)
  if (state.settings.autoRead) await sock.readMessages([raw.key]).catch(() => {})
  await executeCommand(sock, raw, m.text)
}

function mockSocket(messages) {
  return {
    user: { id: `${config.ownerNumber || '94700000000'}:1@s.whatsapp.net`, lid: '123456789@lid' },
    sendMessage: async (_jid, content) => {
      messages.push({ type: content.image ? 'image' : content.video ? 'video' : content.audio ? 'audio' : content.sticker ? 'sticker' : content.poll ? 'poll' : 'text', text: content.text || content.caption || content.poll?.name || '' })
      return { key: { id: `mock-${messages.length}`, remoteJid: 'preview@g.us', fromMe: true } }
    },
    sendPresenceUpdate: async () => {},
    readMessages: async () => {},
    groupMetadata: async () => ({
      id: 'preview@g.us', subject: 'RISUU Preview Group', desc: 'Command verification group', inviteCode: 'RISUU109',
      participants: [
        { id: `${config.ownerNumber || '94700000000'}@s.whatsapp.net`, admin: 'admin' },
        { id: '123456789@lid', phoneNumber: `${config.ownerNumber || '94700000000'}@s.whatsapp.net`, admin: 'admin' },
        { id: '94711111111@s.whatsapp.net', admin: null }
      ]
    }),
    groupParticipantsUpdate: async () => [{ status: '200' }],
    groupSettingUpdate: async () => ({}),
    groupUpdateSubject: async () => ({}),
    groupUpdateDescription: async () => ({}),
    groupInviteCode: async () => 'RISUU109',
    groupRevokeInvite: async () => 'NEWCODE1',
    groupToggleEphemeral: async () => ({}),
    groupRequestParticipantsList: async () => [{ jid: '94711111111@s.whatsapp.net' }],
    groupRequestParticipantsUpdate: async () => [{ status: '200' }],
    groupAcceptInvite: async () => 'preview@g.us',
    groupLeave: async () => ({}),
    updateBlockStatus: async () => ({}),
    updateMediaMessage: async () => ({}),
    readMessages: async () => {}
  }
}

export async function previewCommand(name, args = []) {
  const command = getCommand(name)
  if (!command) return { name, error: 'Command not found', messages: [] }
  const settings = { ...state.settings }
  const prefix = config.prefix
  const mode = config.mode
  const messages = []
  const sock = mockSocket(messages)
  const owner = config.ownerNumber || '94700000000'
  const raw = {
    key: { remoteJid: 'preview@g.us', participant: `${owner}@s.whatsapp.net`, participantAlt: `${owner}@s.whatsapp.net`, id: 'preview', fromMe: false },
    pushName: 'Risuu Tester',
    message: { conversation: `${state.settings.prefix}${command.pattern} ${args.join(' ')}`.trim() }
  }
  try {
    const result = await executeCommand(sock, raw, raw.message.conversation, { mock: true })
    return { name, command: command.pattern, category: command.category, result, messages }
  } finally {
    Object.assign(state.settings, settings)
    config.prefix = prefix
    config.mode = mode
  }
}

export async function verifyAllCommands() {
  const failures = []
  for (const command of commands) {
    const preview = await previewCommand(command.pattern, command.testArgs)
    if (preview.result?.error || !preview.messages.length) failures.push({ name: command.pattern, error: preview.result?.error || 'No output' })
  }
  return { total: commands.length, passed: commands.length - failures.length, failures }
}
