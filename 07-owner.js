import { cmd } from '../command.js'
import { config } from '../config.js'
import { fetchJson, stripNonDigits } from '../lib/functions.js'
import { state } from '../lib/store.js'

const use = (ctx, example) => `Usage: ${ctx.prefix}${ctx.command.pattern} ${example}`
const target = (ctx) => ctx.targets[0]

cmd({ pattern: 'broadcast', aliases: ['bc'], category: 'owner', desc: 'Broadcast to known chats', usage: 'message', testArgs: ['hello', 'everyone'], owner: true, react: '📢' }, async (sock, _raw, _m, ctx) => {
  if (!ctx.q) return use(ctx, 'message')
  if (ctx.mock) return '📢 Broadcast preview: 1 chat ready.'
  let sent = 0
  for (const jid of state.chats.slice(0, 100)) {
    try {
      await sock.sendMessage(jid, { text: `📢 *${config.botName} BROADCAST*\n\n${ctx.q}` })
      sent++
      await new Promise((resolve) => setTimeout(resolve, 350))
    } catch { /* continue with remaining chats */ }
  }
  return `📢 Broadcast sent to ${sent}/${Math.min(state.chats.length, 100)} chats.`
})

cmd({ pattern: 'setprefix', category: 'owner', desc: 'Change command prefix', usage: '!', testArgs: ['!'], owner: true, react: '⌨️' }, async (_s, _r, _m, ctx) => {
  const value = (ctx.args[0] || '').trim().slice(0, 3)
  if (!value) return use(ctx, '!')
  state.settings.prefix = value
  config.prefix = value
  return `⌨️ Prefix changed to *${value}*`
})

cmd({ pattern: 'setmode', category: 'owner', desc: 'Set public/private/groups/inbox mode', usage: 'public', testArgs: ['public'], owner: true, react: '🧭' }, async (_s, _r, _m, ctx) => {
  const mode = ctx.args[0]?.toLowerCase()
  if (!['public', 'private', 'groups', 'inbox'].includes(mode)) return use(ctx, 'public|private|groups|inbox')
  state.settings.mode = mode
  config.mode = mode
  return `🧭 Bot mode changed to *${mode.toUpperCase()}*`
})

cmd({ pattern: 'block', category: 'owner', desc: 'Block a WhatsApp user', usage: 'number', testArgs: ['94711111111'], owner: true, react: '⛔' }, async (sock, _r, _m, ctx) => {
  if (!target(ctx)) return use(ctx, '94771234567')
  await sock.updateBlockStatus(target(ctx), 'block')
  return `⛔ Blocked ${stripNonDigits(target(ctx))}`
})
cmd({ pattern: 'unblock', category: 'owner', desc: 'Unblock a WhatsApp user', usage: 'number', testArgs: ['94711111111'], owner: true, react: '✅' }, async (sock, _r, _m, ctx) => {
  if (!target(ctx)) return use(ctx, '94771234567')
  await sock.updateBlockStatus(target(ctx), 'unblock')
  return `✅ Unblocked ${stripNonDigits(target(ctx))}`
})

cmd({ pattern: 'join', category: 'owner', desc: 'Join a group by invite link', usage: 'invite-link', testArgs: ['https://chat.whatsapp.com/RISUU109'], owner: true, react: '🔗' }, async (sock, _r, _m, ctx) => {
  const code = ctx.q.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/)?.[1]
  if (!code) return use(ctx, 'https://chat.whatsapp.com/...')
  const jid = await sock.groupAcceptInvite(code)
  return `🔗 Joined group: ${jid}`
})

cmd({ pattern: 'leave', category: 'owner', desc: 'Leave the current group', owner: true, group: true, react: '👋' }, async (sock, _r, m, ctx) => {
  if (!ctx.mock) await sock.groupLeave(m.chat)
  return '👋 Leaving this group.'
})

cmd({ pattern: 'restart', category: 'owner', desc: 'Restart WhatsApp connection', owner: true, react: '♻️' }, async (_s, _r, _m, ctx) => {
  if (!ctx.mock) setTimeout(async () => (await import('../lib/bot.js')).restartBot(), 900)
  return '♻️ Restarting RISUU connection...'
})

cmd({ pattern: 'update', category: 'owner', desc: 'Check dependency updates', owner: true, react: '⬆️' }, async (_s, _r, _m, ctx) => {
  if (ctx.mock) return '⬆️ Update check preview: dependencies reachable.'
  const baileys = await fetchJson('https://registry.npmjs.org/@whiskeysockets%2fbaileys/latest')
  return `⬆️ *UPDATE CHECK*\n\nRISUU: 2.0.0\nInstalled Baileys: 7.0.0-rc14\nLatest Baileys: ${baileys.version || 'unknown'}\nWA Web: ${state.waVersion || 'unknown'}`
})

cmd({ pattern: 'shutdown', aliases: ['stop'], category: 'owner', desc: 'Stop the bot process', owner: true, react: '🛑' }, async (_s, _r, _m, ctx) => {
  if (!ctx.mock) setTimeout(() => process.exit(0), 900)
  return '🛑 Shutting down RISUU MINI BOT...'
})
