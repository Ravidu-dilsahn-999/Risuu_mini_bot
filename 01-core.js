import os from 'node:os'
import { cmd, commandGroups, commands } from '../command.js'
import { config } from '../config.js'
import { formatUptime } from '../lib/functions.js'
import { state } from '../lib/store.js'

cmd({ pattern: 'menu', aliases: ['help', 'commands'], category: 'core', desc: 'Show all 109 commands', react: '📜' }, async (_sock, _raw, m, { args, prefix }) => {
  const groups = commandGroups()
  const selected = String(args[0] || '').toLowerCase()
  const names = Object.keys(groups).sort()
  if (selected && groups[selected]) {
    const list = groups[selected].map((item) => `${prefix}${item.pattern}${item.usage ? ` ${item.usage}` : ''} — ${item.desc}`)
    return `╭─❖ *${selected.toUpperCase()} COMMANDS* ❖─╮\n\n${list.join('\n')}\n\n╰─ ${list.length} commands ─╯`
  }
  const sections = names.map((name) => `*${name.toUpperCase()}* · ${groups[name].length}\n${groups[name].map((item) => prefix + item.pattern).join('  ')}`)
  return `╭━━━〔 *${config.botName}* 〕━━━╮\n┃  Hello ${m.pushName} ✨\n┃  *${commands.length}/109 commands online*\n┃  Prefix: ${prefix} · Mode: ${state.settings.mode}\n╰━━━━━━━━━━━━━━━━━━╯\n\n${sections.join('\n\n')}\n\n_Use ${prefix}menu group for details_`
})

cmd({ pattern: 'alive', category: 'core', desc: 'Check bot status', aliases: ['online'], react: '💚' }, async () =>
  `╭─❖ *RISUU IS ALIVE* ❖─╮\n\n🟢 Status: Online\n⚡ Commands: ${commands.length}/109\n⏱ Uptime: ${formatUptime()}\n🎬 Animations: ${state.settings.animations ? 'ON' : 'OFF'}\n\n╰────────────────╯`)

cmd({ pattern: 'ping', category: 'core', desc: 'Measure response latency', react: '🏓' }, async () => {
  const start = performance.now()
  await Promise.resolve()
  return `🏓 *PONG!*\n⚡ Engine latency: ${(performance.now() - start).toFixed(2)}ms`
})

cmd({ pattern: 'uptime', category: 'core', desc: 'Show running time', react: '⏱️' }, async () => `⏱️ *Uptime:* ${formatUptime()}`)

cmd({ pattern: 'stats', category: 'core', desc: 'Show live bot statistics', react: '📊' }, async () =>
  `📊 *RISUU LIVE STATS*\n\nMessages: ${state.messages}\nCommands run: ${state.commandRuns}\nReplies: ${state.replies}\nKnown chats: ${state.chats.length}\nUptime: ${formatUptime()}\nStatus: ${state.status}`)

cmd({ pattern: 'about', category: 'core', desc: 'About this bot', react: '🤖' }, async () =>
  `🤖 *${config.botName}*\n\nA modern WhatsApp bot rebuilt from the Robin Max Part 02 source.\n\n✦ 109 real command handlers\n✦ Baileys 7 + current WA Web version\n✦ LID-aware owner/admin checks\n✦ Animated replies + pairing dashboard`)

cmd({ pattern: 'owner', category: 'core', desc: 'Show owner information', react: '👑' }, async () =>
  config.ownerNumber ? `👑 *Bot Owner*\nwa.me/${config.ownerNumber}` : '👑 Owner number is not configured. Set OWNER_NUMBER in .env.')

cmd({ pattern: 'system', category: 'core', desc: 'Show runtime system information', react: '🖥️' }, async () =>
  `🖥️ *SYSTEM*\n\nOS: ${os.platform()} ${os.arch()}\nNode: ${process.version}\nCPU: ${os.cpus()[0]?.model || 'unknown'}\nRAM: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB\nHost free RAM: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)} GB`)

cmd({ pattern: 'version', category: 'core', desc: 'Show bot and protocol versions', aliases: ['ver'], react: '🧬' }, async () =>
  `🧬 *VERSION INFO*\nBot: 2.0.0\nCommands: ${commands.length}/109\nWA Web: ${state.waVersion || 'detecting'}\nNode: ${process.version}`)
