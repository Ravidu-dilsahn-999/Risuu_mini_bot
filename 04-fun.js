import crypto from 'node:crypto'
import { cmd } from '../command.js'
import { pick } from '../lib/functions.js'

const jokes = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'මගේ Wi-Fi එකයි මමයි එක වගේ — pressure වැඩි වුණාම connection යනවා.',
  'A SQL query walks into a bar and asks: “Can I join you?”',
  'මම gym යන්න plan කළා. Plan එකට හොඳ workout එකක් ලැබුණා.',
  'There are 10 kinds of people: those who know binary and those who do not.'
]
const quotes = [
  'Small steps every day create remarkable journeys.',
  'ඔයාගේ වේගය අඩු වුණත් නවතින්න එපා.',
  'Discipline carries you when motivation goes quiet.',
  'The best time to begin is now.',
  'වැරදි කියන්නේ අවසානයක් නෙවෙයි; ඊළඟ version එකේ changelog එකයි.'
]
const facts = [
  'Octopuses have three hearts.',
  'Honey can remain edible for thousands of years.',
  'A day on Venus is longer than its year.',
  'The first computer bug was an actual moth.',
  'Sharks existed before trees.'
]
const compliments = ['ඔයාගේ energy එක room එකක් light කරන්න පුළුවන්.', 'You make difficult things look possible.', 'ඔයා හිතනවට වඩා ඔයා talented.', 'Your kindness is a real superpower.', 'ඔයාගේ smile එක premium feature එකක්.']
const roasts = ['ඔයාගේ loading speed එක Internet Explorer nostalgia එකක්.', 'ඔයා smart තමයි… airplane mode එකේ.', 'Your Wi-Fi has more connections than your plan.', 'ඔයාගේ excuses වලට separate database එකක් ඕනේ.', 'Even your shadow needs a break from following you.']
const truths = ['ඔයා කවදාවත් කාටවත් නොකියපු බය මොකක්ද?', 'What is the last lie you told?', 'ඔයාගේ biggest crush කවුද?', 'What habit do you want to change?', 'ඔයාට ආයෙත් කරන්න ලැබුණොත් වෙනස් කරන දෙයක් කියන්න.']
const dares = ['ඔයාගේ last photo එකට funny caption එකක් දාන්න.', 'Sing one line of your favourite song.', 'Send a voice note saying “RISUU is watching”.', 'විනාඩි 10ක් profile name එක “Potato” කරන්න.', 'Group එකේ කෙනෙක්ට genuine compliment එකක් දෙන්න.']
const riddles = [
  ['I speak without a mouth and hear without ears. What am I?', 'An echo'],
  ['What has keys but cannot open locks?', 'A keyboard'],
  ['මට මුහුණක් සහ අත් දෙකක් තියෙනවා, නමුත් කකුල් නැහැ. මම කවුද?', 'A clock'],
  ['What gets wetter while drying?', 'A towel'],
  ['What can travel around the world while staying in one corner?', 'A stamp']
]
const pendingRiddles = new Map()
const score = () => crypto.randomInt(1, 101)

cmd({ pattern: 'joke', category: 'fun', desc: 'Get a random joke', react: '😂' }, async () => `😂 ${pick(jokes)}`)
cmd({ pattern: 'quote', category: 'fun', desc: 'Get an inspiring quote', react: '✨' }, async () => `✨ “${pick(quotes)}”`)
cmd({ pattern: 'fact', category: 'fun', desc: 'Learn a random fact', react: '💡' }, async () => `💡 ${pick(facts)}`)
cmd({ pattern: 'compliment', category: 'fun', desc: 'Get a compliment', react: '💖' }, async () => `💖 ${pick(compliments)}`)
cmd({ pattern: 'roast', category: 'fun', desc: 'Get a playful roast', react: '🔥' }, async () => `🔥 ${pick(roasts)}\n_(joke එකක් විතරයි)_`)

cmd({ pattern: '8ball', aliases: ['ask'], category: 'fun', desc: 'Ask the magic 8-ball', usage: 'question', testArgs: ['Will', 'I', 'win?'], react: '🎱' }, async (_s, _r, _m, ctx) => ctx.q ? `🎱 *${pick(['Definitely yes', 'Very likely', 'Ask again later', 'The signs are unclear', 'Probably not', 'Absolutely not', 'Trust your instinct'])}*` : `Usage: ${ctx.prefix}8ball question`)
cmd({ pattern: 'truth', category: 'fun', desc: 'Truth question', react: '🤫' }, async () => `🤫 *TRUTH*\n${pick(truths)}`)
cmd({ pattern: 'dare', category: 'fun', desc: 'Dare challenge', react: '😈' }, async () => `😈 *DARE*\n${pick(dares)}`)
cmd({ pattern: 'riddle', category: 'fun', desc: 'Get a riddle', react: '🧩' }, async (_s, _r, m) => {
  const [question, answer] = pick(riddles)
  pendingRiddles.set(m.chat, answer)
  return `🧩 *RIDDLE*\n${question}\n\nUse .answer when ready.`
})
cmd({ pattern: 'answer', category: 'fun', desc: 'Reveal the riddle answer', react: '✅' }, async (_s, _r, m) => {
  const answer = pendingRiddles.get(m.chat)
  if (!answer) return '🧩 First use .riddle'
  pendingRiddles.delete(m.chat)
  return `✅ *Answer:* ${answer}`
})

cmd({ pattern: 'emoji', category: 'fun', desc: 'Random emoji combo', react: '🌈' }, async () => `🌈 ${pick(['✨🌙💜', '🔥😎⚡', '🌸🦋💫', '👾🎮🚀', '💚🤖✅', '🍓☁️🎧'])}`)
cmd({ pattern: 'mood', category: 'fun', desc: 'Read your current mood', react: '🌡️' }, async () => `🌡️ *Mood scan:* ${pick(['Chill 😌', 'Main character ✨', 'Sleepy 🥱', 'Chaotic 😈', 'Focused 🎯', 'Happy 🌻'])}`)
cmd({ pattern: 'lucky', category: 'fun', desc: 'Get lucky numbers', react: '🍀' }, async () => `🍀 *Lucky number:* ${crypto.randomInt(1, 100)}\nLucky colour: ${pick(['Mint', 'Violet', 'Blue', 'Gold', 'Pink', 'Black'])}`)

cmd({ pattern: 'rate', category: 'fun', desc: 'Rate anything', usage: 'my profile', testArgs: ['my', 'profile'], react: '⭐' }, async (_s, _r, _m, ctx) => ctx.q ? `⭐ *${ctx.q}: ${score()}%*` : `Usage: ${ctx.prefix}rate something`)
cmd({ pattern: 'ship', category: 'fun', desc: 'Compatibility score', usage: 'name1 & name2', testArgs: ['Risuu', '&', 'Robin'], react: '🚢' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return `Usage: ${ctx.prefix}ship name1 & name2`
  const value = score(); const filled = Math.ceil(value / 10)
  return `🚢 *SHIP METER*\n${ctx.q}\n${'█'.repeat(filled)}${'░'.repeat(10 - filled)}\nCompatibility: ${value}%`
})
cmd({ pattern: 'love', category: 'fun', desc: 'Love meter', usage: 'name', testArgs: ['Risuu'], react: '❤️' }, async (_s, _r, m, ctx) => ctx.q ? `❤️ *${m.pushName} + ${ctx.q}*\nLove score: ${score()}%` : `Usage: ${ctx.prefix}love name`)

cmd({ pattern: 'horoscope', category: 'fun', desc: 'Quick horoscope', usage: 'leo', testArgs: ['leo'], react: '🔮' }, async (_s, _r, _m, ctx) => {
  const sign = ctx.args[0]?.toLowerCase(); const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
  return signs.includes(sign) ? `🔮 *${sign.toUpperCase()}*\n${pick(['A calm choice will beat a rushed one today.', 'A surprise message may brighten your day.', 'Protect your energy and finish one important task.', 'A creative idea deserves your attention.', 'Be honest, but keep your words gentle.'])}` : `Usage: ${ctx.prefix}horoscope leo`
})
cmd({ pattern: 'wouldyourather', aliases: ['wyr'], category: 'fun', desc: 'Would you rather question', react: '🤔' }, async () => `🤔 *WOULD YOU RATHER*\n${pick(['Fly or become invisible?', 'Know every language or play every instrument?', 'Live by the beach or in the mountains?', 'Have unlimited time or unlimited money?', 'Travel to the past or the future?'])}`)
cmd({ pattern: 'neverhaveiever', aliases: ['nhie'], category: 'fun', desc: 'Never have I ever prompt', react: '🙈' }, async () => `🙈 *NEVER HAVE I EVER*\n${pick(['pretended to be asleep to avoid a conversation.', 'sent a message to the wrong person.', 'laughed at the worst possible moment.', 'stayed awake all night gaming.', 'searched my own name online.'])}`)
cmd({ pattern: 'topic', category: 'fun', desc: 'Conversation topic', react: '💬' }, async () => `💬 *TOPIC*\n${pick(['What is one skill everyone should learn?', 'Which place do you want to visit most?', 'What is your funniest school memory?', 'If you could meet anyone, who would it be?', 'What would your perfect day look like?'])}`)
