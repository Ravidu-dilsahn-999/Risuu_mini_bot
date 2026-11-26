import crypto from 'node:crypto'
import QRCode from 'qrcode'
import { cmd } from '../command.js'
import { calc, pick } from '../lib/functions.js'

const need = (ctx, example) => ctx.q || `Usage: ${ctx.prefix}${ctx.command.pattern} ${example}`

cmd({ pattern: 'time', category: 'utility', desc: 'Current time', react: '🕐' }, async () => `🕐 *Time:* ${new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium' }).format(new Date())}`)
cmd({ pattern: 'date', category: 'utility', desc: 'Current date', react: '📅' }, async () => `📅 *Date:* ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date())}`)
cmd({ pattern: 'day', category: 'utility', desc: 'Current weekday', react: '🗓️' }, async () => `🗓️ *Today:* ${new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date())}`)

cmd({ pattern: 'calc', category: 'utility', desc: 'Safe calculator', usage: '12*(3+4)', testArgs: ['12*(3+4)'], react: '🧮' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return need(ctx, '12*(3+4)')
  return `🧮 ${ctx.q} = *${calc(ctx.q)}*`
})

cmd({ pattern: 'qr', category: 'utility', desc: 'Create a QR code', usage: 'text', testArgs: ['RISUU 109'], react: '🔳' }, async (sock, raw, m, ctx) => {
  if (!ctx.q) return need(ctx, 'your text')
  if (ctx.mock) return `🔳 QR generated for: ${ctx.q}`
  const image = await QRCode.toBuffer(ctx.q, { width: 640, margin: 2, color: { dark: '#07111d', light: '#ffffff' } })
  await sock.sendMessage(m.chat, { image, caption: `🔳 QR · ${ctx.q}` }, { quoted: raw })
  return null
})

cmd({ pattern: 'uuid', category: 'utility', desc: 'Generate a UUID', react: '🆔' }, async () => `🆔 ${crypto.randomUUID()}`)
cmd({ pattern: 'password', category: 'utility', desc: 'Generate a secure password', usage: '16', testArgs: ['16'], react: '🔐' }, async (_s, _r, _m, ctx) => {
  const length = Math.max(8, Math.min(64, Number(ctx.args[0]) || 16))
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  return `🔐 ${Array.from(crypto.randomBytes(length), (byte) => chars[byte % chars.length]).join('')}`
})

cmd({ pattern: 'random', category: 'utility', desc: 'Random number in a range', usage: '1 100', testArgs: ['1', '100'], react: '🎯' }, async (_s, _r, _m, ctx) => {
  const min = Number(ctx.args[0] ?? 1); const max = Number(ctx.args[1] ?? 100)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return need(ctx, '1 100')
  return `🎯 *Random:* ${crypto.randomInt(Math.ceil(min), Math.floor(max) + 1)}`
})

cmd({ pattern: 'roll', category: 'utility', desc: 'Roll a dice', usage: '6', testArgs: ['6'], react: '🎲' }, async (_s, _r, _m, ctx) => {
  const sides = Math.max(2, Math.min(1000, Number(ctx.args[0]) || 6))
  return `🎲 Rolled *${crypto.randomInt(1, sides + 1)}* / ${sides}`
})
cmd({ pattern: 'coin', category: 'utility', desc: 'Flip a coin', react: '🪙' }, async () => `🪙 *${pick(['HEADS', 'TAILS'])}*`)

cmd({ pattern: 'choose', category: 'utility', desc: 'Choose one option', usage: 'tea|coffee', testArgs: ['tea|coffee'], react: '👉' }, async (_s, _r, _m, ctx) => {
  const options = ctx.q.split(/[|,]/).map((value) => value.trim()).filter(Boolean)
  return options.length > 1 ? `👉 I choose *${pick(options)}*` : need(ctx, 'tea|coffee|milk')
})

cmd({ pattern: 'percentage', category: 'utility', desc: 'Calculate a percentage', usage: '25 200', testArgs: ['25', '200'], react: '💯' }, async (_s, _r, _m, ctx) => {
  const part = Number(ctx.args[0]); const total = Number(ctx.args[1])
  return Number.isFinite(part) && total ? `💯 ${part} is *${((part / total) * 100).toFixed(2)}%* of ${total}` : need(ctx, '25 200')
})

cmd({ pattern: 'age', category: 'utility', desc: 'Calculate age from birth date', usage: '2000-12-31', testArgs: ['2000-12-31'], react: '🎂' }, async (_s, _r, _m, ctx) => {
  const born = new Date(ctx.args[0]); const now = new Date()
  if (Number.isNaN(born.getTime()) || born > now) return need(ctx, '2000-12-31')
  let age = now.getFullYear() - born.getFullYear()
  if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age--
  return `🎂 *Age:* ${age} years`
})

cmd({ pattern: 'bmi', category: 'utility', desc: 'Calculate BMI', usage: '65 1.72', testArgs: ['65', '1.72'], react: '⚖️' }, async (_s, _r, _m, ctx) => {
  const weight = Number(ctx.args[0]); const height = Number(ctx.args[1])
  if (!weight || !height) return need(ctx, 'weightKg heightM')
  const bmi = weight / height ** 2
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'High'
  return `⚖️ *BMI:* ${bmi.toFixed(1)} · ${label}`
})

cmd({ pattern: 'binary', category: 'utility', desc: 'Decimal to binary', usage: '42', testArgs: ['42'], react: '0️⃣' }, async (_s, _r, _m, ctx) => Number.isSafeInteger(Number(ctx.args[0])) ? `0️⃣ ${Number(ctx.args[0]).toString(2)}` : need(ctx, '42'))
cmd({ pattern: 'decimal', category: 'utility', desc: 'Binary to decimal', usage: '101010', testArgs: ['101010'], react: '🔢' }, async (_s, _r, _m, ctx) => /^[01]+$/.test(ctx.args[0] || '') ? `🔢 ${parseInt(ctx.args[0], 2)}` : need(ctx, '101010'))
cmd({ pattern: 'hex', category: 'utility', desc: 'Decimal to hexadecimal', usage: '255', testArgs: ['255'], react: '🔶' }, async (_s, _r, _m, ctx) => Number.isSafeInteger(Number(ctx.args[0])) ? `🔶 0x${Number(ctx.args[0]).toString(16).toUpperCase()}` : need(ctx, '255'))
cmd({ pattern: 'base64', category: 'utility', desc: 'Encode Base64', usage: 'hello', testArgs: ['hello'], react: '🔏' }, async (_s, _r, _m, ctx) => ctx.q ? `🔏 ${Buffer.from(ctx.q).toString('base64')}` : need(ctx, 'hello'))
cmd({ pattern: 'unbase64', category: 'utility', desc: 'Decode Base64', usage: 'aGVsbG8=', testArgs: ['aGVsbG8='], react: '🔓' }, async (_s, _r, _m, ctx) => ctx.q ? `🔓 ${Buffer.from(ctx.q, 'base64').toString('utf8')}` : need(ctx, 'aGVsbG8='))
cmd({ pattern: 'hash', category: 'utility', desc: 'Create SHA-256 hash', usage: 'hello', testArgs: ['hello'], react: '#️⃣' }, async (_s, _r, _m, ctx) => ctx.q ? `#️⃣ ${crypto.createHash('sha256').update(ctx.q).digest('hex')}` : need(ctx, 'hello'))
