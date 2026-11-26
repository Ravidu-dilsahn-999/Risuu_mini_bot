import { cmd } from '../command.js'
import { groupMetadata, normalizeJid, stripNonDigits } from '../lib/functions.js'
import { state } from '../lib/store.js'

const use = (ctx, example) => `Usage: ${ctx.prefix}${ctx.command.pattern} ${example}`
const target = (ctx) => ctx.targets[0]

cmd({ pattern: 'groupinfo', category: 'group', desc: 'Show group information', group: true, react: '👥' }, async (sock, _raw, m) => {
  const meta = await groupMetadata(sock, m.chat, true)
  return `👥 *${meta.subject}*\n\nMembers: ${meta.participants?.length || meta.size || 0}\nAdmins: ${(meta.participants || []).filter((p) => p.admin).length}\nCreated: ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : 'unknown'}\nDescription: ${meta.desc || 'none'}\nID: ${m.chat}`
})

cmd({ pattern: 'admins', category: 'group', desc: 'Mention all group admins', group: true, react: '🛡️' }, async (sock, _raw, m) => {
  const meta = await groupMetadata(sock, m.chat)
  const mentions = (meta.participants || []).filter((p) => p.admin).map((p) => normalizeJid(p.id))
  return { text: `🛡️ *GROUP ADMINS*\n\n${mentions.map((jid) => `@${stripNonDigits(jid.split('@')[0])}`).join('\n') || 'No admins found'}`, mentions }
})

cmd({ pattern: 'tagall', category: 'group', desc: 'Tag every member', usage: 'message', group: true, admin: true, react: '📣' }, async (sock, raw, m, ctx) => {
  const meta = await groupMetadata(sock, m.chat, true)
  const mentions = (meta.participants || []).map((p) => normalizeJid(p.id)).filter(Boolean)
  const lines = mentions.map((jid, index) => `${index + 1}. @${stripNonDigits(jid.split('@')[0])}`)
  await sock.sendMessage(m.chat, { text: `📣 *${ctx.q || 'Attention everyone'}*\n\n${lines.join('\n')}`, mentions }, { quoted: raw })
  return null
})

cmd({ pattern: 'hidetag', category: 'group', desc: 'Mention everyone invisibly', usage: 'message', testArgs: ['hello', 'all'], group: true, admin: true, react: '🥷' }, async (sock, raw, m, ctx) => {
  const meta = await groupMetadata(sock, m.chat, true)
  const mentions = (meta.participants || []).map((p) => normalizeJid(p.id)).filter(Boolean)
  await sock.sendMessage(m.chat, { text: ctx.q || '📣 Attention everyone', mentions }, { quoted: raw })
  return null
})

cmd({ pattern: 'welcome', category: 'group', desc: 'Toggle welcome messages', usage: 'on|off', testArgs: ['on'], group: true, admin: true, react: '👋' }, async (_s, _r, _m, ctx) => {
  const mode = ctx.args[0]?.toLowerCase()
  if (!['on', 'off'].includes(mode)) return `👋 Welcome is ${state.settings.welcome ? 'ON' : 'OFF'}\n${use(ctx, 'on|off')}`
  state.settings.welcome = mode === 'on'
  return `👋 Welcome messages *${mode.toUpperCase()}*`
})

cmd({ pattern: 'add', category: 'group', desc: 'Add a participant', usage: '9477...', testArgs: ['94711111111'], group: true, admin: true, botAdmin: true, react: '➕' }, async (sock, _r, m, ctx) => {
  if (!target(ctx)) return use(ctx, '94771234567')
  await sock.groupParticipantsUpdate(m.chat, [target(ctx)], 'add')
  return `➕ Add request sent for ${stripNonDigits(target(ctx))}`
})
cmd({ pattern: 'kick', aliases: ['remove'], category: 'group', desc: 'Remove a participant', usage: '@user', testArgs: ['94711111111'], group: true, admin: true, botAdmin: true, react: '🚪' }, async (sock, _r, m, ctx) => {
  if (!target(ctx)) return use(ctx, '@user or number')
  await sock.groupParticipantsUpdate(m.chat, [target(ctx)], 'remove')
  return `🚪 Removed @${stripNonDigits(target(ctx))}`
})
cmd({ pattern: 'promote', category: 'group', desc: 'Promote a participant', usage: '@user', testArgs: ['94711111111'], group: true, admin: true, botAdmin: true, react: '⬆️' }, async (sock, _r, m, ctx) => {
  if (!target(ctx)) return use(ctx, '@user or number')
  await sock.groupParticipantsUpdate(m.chat, [target(ctx)], 'promote')
  return `⬆️ Promoted @${stripNonDigits(target(ctx))}`
})
cmd({ pattern: 'demote', category: 'group', desc: 'Demote an admin', usage: '@user', testArgs: ['94711111111'], group: true, admin: true, botAdmin: true, react: '⬇️' }, async (sock, _r, m, ctx) => {
  if (!target(ctx)) return use(ctx, '@user or number')
  await sock.groupParticipantsUpdate(m.chat, [target(ctx)], 'demote')
  return `⬇️ Demoted @${stripNonDigits(target(ctx))}`
})

cmd({ pattern: 'mute', category: 'group', desc: 'Admins-only messaging', group: true, admin: true, botAdmin: true, react: '🔇' }, async (sock, _r, m) => {
  await sock.groupSettingUpdate(m.chat, 'announcement')
  return '🔇 Group muted · admins can send messages.'
})
cmd({ pattern: 'unmute', category: 'group', desc: 'Allow all members to message', group: true, admin: true, botAdmin: true, react: '🔊' }, async (sock, _r, m) => {
  await sock.groupSettingUpdate(m.chat, 'not_announcement')
  return '🔊 Group unmuted · everyone can send messages.'
})

cmd({ pattern: 'subject', category: 'group', desc: 'Change group subject', usage: 'new name', testArgs: ['RISUU', 'GROUP'], group: true, admin: true, botAdmin: true, react: '✏️' }, async (sock, _r, m, ctx) => {
  if (!ctx.q) return use(ctx, 'new group name')
  await sock.groupUpdateSubject(m.chat, ctx.q.slice(0, 100))
  return `✏️ Subject changed to *${ctx.q.slice(0, 100)}*`
})
cmd({ pattern: 'description', aliases: ['desc'], category: 'group', desc: 'Change group description', usage: 'new text', testArgs: ['RISUU', 'description'], group: true, admin: true, botAdmin: true, react: '📝' }, async (sock, _r, m, ctx) => {
  if (!ctx.q) return use(ctx, 'new description')
  await sock.groupUpdateDescription(m.chat, ctx.q.slice(0, 500))
  return '📝 Group description updated.'
})

cmd({ pattern: 'grouplink', aliases: ['link'], category: 'group', desc: 'Get group invite link', group: true, botAdmin: true, react: '🔗' }, async (sock, _r, m) => `🔗 https://chat.whatsapp.com/${await sock.groupInviteCode(m.chat)}`)
cmd({ pattern: 'revoke', category: 'group', desc: 'Reset group invite link', group: true, admin: true, botAdmin: true, react: '♻️' }, async (sock, _r, m) => `♻️ New link:\nhttps://chat.whatsapp.com/${await sock.groupRevokeInvite(m.chat)}`)

cmd({ pattern: 'disappear', category: 'group', desc: 'Set disappearing messages', usage: 'off|1d|7d|90d', testArgs: ['7d'], group: true, admin: true, botAdmin: true, react: '⏳' }, async (sock, _r, m, ctx) => {
  const durations = { off: 0, '1d': 86400, '7d': 604800, '90d': 7776000 }
  const value = durations[ctx.args[0]?.toLowerCase()]
  if (value == null) return use(ctx, 'off|1d|7d|90d')
  await sock.groupToggleEphemeral(m.chat, value)
  return `⏳ Disappearing messages: *${ctx.args[0].toUpperCase()}*`
})

cmd({ pattern: 'approve', category: 'group', desc: 'Approve pending join requests', usage: 'all|number', testArgs: ['all'], group: true, admin: true, botAdmin: true, react: '✅' }, async (sock, _r, m, ctx) => {
  const requests = await sock.groupRequestParticipantsList(m.chat)
  const jids = ctx.args[0] === 'all' ? requests.map((item) => item.jid) : [target(ctx)].filter(Boolean)
  if (!jids.length) return '✅ No matching pending requests.'
  await sock.groupRequestParticipantsUpdate(m.chat, jids, 'approve')
  return `✅ Approved ${jids.length} request(s).`
})
cmd({ pattern: 'reject', category: 'group', desc: 'Reject pending join requests', usage: 'all|number', testArgs: ['all'], group: true, admin: true, botAdmin: true, react: '❌' }, async (sock, _r, m, ctx) => {
  const requests = await sock.groupRequestParticipantsList(m.chat)
  const jids = ctx.args[0] === 'all' ? requests.map((item) => item.jid) : [target(ctx)].filter(Boolean)
  if (!jids.length) return '✅ No matching pending requests.'
  await sock.groupRequestParticipantsUpdate(m.chat, jids, 'reject')
  return `❌ Rejected ${jids.length} request(s).`
})

cmd({ pattern: 'lock', category: 'group', desc: 'Only admins can edit group info', group: true, admin: true, botAdmin: true, react: '🔒' }, async (sock, _r, m) => {
  await sock.groupSettingUpdate(m.chat, 'locked')
  return '🔒 Group info locked.'
})
cmd({ pattern: 'unlock', category: 'group', desc: 'Members can edit group info', group: true, admin: true, botAdmin: true, react: '🔓' }, async (sock, _r, m) => {
  await sock.groupSettingUpdate(m.chat, 'unlocked')
  return '🔓 Group info unlocked.'
})
