import { cmd } from '../command.js'

const use = (ctx, example = 'text') => `Usage: ${ctx.prefix}${ctx.command.pattern} ${example}`
const words = (text) => text.trim().split(/\s+/).filter(Boolean)
const morse = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' }

cmd({ pattern: 'reverse', category: 'text', desc: 'Reverse text', usage: 'hello', testArgs: ['hello'], react: '🔁' }, async (_s, _r, _m, ctx) => ctx.q ? `🔁 ${[...ctx.q].reverse().join('')}` : use(ctx))
cmd({ pattern: 'upper', category: 'text', desc: 'UPPERCASE text', usage: 'hello', testArgs: ['hello'], react: '🔠' }, async (_s, _r, _m, ctx) => ctx.q ? ctx.q.toUpperCase() : use(ctx))
cmd({ pattern: 'lower', category: 'text', desc: 'lowercase text', usage: 'HELLO', testArgs: ['HELLO'], react: '🔡' }, async (_s, _r, _m, ctx) => ctx.q ? ctx.q.toLowerCase() : use(ctx))
cmd({ pattern: 'title', category: 'text', desc: 'Title Case text', usage: 'hello world', testArgs: ['hello', 'world'], react: '✍️' }, async (_s, _r, _m, ctx) => ctx.q ? ctx.q.toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase()) : use(ctx))
cmd({ pattern: 'count', category: 'text', desc: 'Full text count', usage: 'some text', testArgs: ['some', 'text'], react: '🔢' }, async (_s, _r, _m, ctx) => ctx.q ? `🔢 Words: ${words(ctx.q).length}\nCharacters: ${[...ctx.q].length}\nWithout spaces: ${[...ctx.q.replace(/\s/g, '')].length}\nLines: ${ctx.q.split('\n').length}` : use(ctx))
cmd({ pattern: 'wordcount', category: 'text', desc: 'Count words', usage: 'some text', testArgs: ['some', 'text'], react: '📝' }, async (_s, _r, _m, ctx) => ctx.q ? `📝 *${words(ctx.q).length} words*` : use(ctx))
cmd({ pattern: 'charcount', category: 'text', desc: 'Count characters', usage: 'some text', testArgs: ['some', 'text'], react: '🔤' }, async (_s, _r, _m, ctx) => ctx.q ? `🔤 *${[...ctx.q].length} characters*` : use(ctx))
cmd({ pattern: 'trim', category: 'text', desc: 'Remove extra spaces', usage: 'some   text', testArgs: ['some', 'text'], react: '✂️' }, async (_s, _r, _m, ctx) => ctx.q ? ctx.q.trim().replace(/\s+/g, ' ') : use(ctx))
cmd({ pattern: 'repeat', category: 'text', desc: 'Repeat text', usage: '3 hello', testArgs: ['3', 'hello'], react: '🔂' }, async (_s, _r, _m, ctx) => {
  const count = Math.max(1, Math.min(10, Number(ctx.args[0]) || 0)); const text = ctx.args.slice(1).join(' ')
  return text ? Array(count).fill(text).join('\n') : use(ctx, '3 hello')
})
cmd({ pattern: 'replace', category: 'text', desc: 'Replace text', usage: 'old|new|text', testArgs: ['cat|dog|my', 'cat'], react: '♻️' }, async (_s, _r, _m, ctx) => {
  const [from, to, ...rest] = ctx.q.split('|'); const text = rest.join('|')
  return from && text ? text.split(from).join(to || '') : use(ctx, 'old|new|text')
})
cmd({ pattern: 'urlencode', category: 'text', desc: 'URL encode text', usage: 'hello world', testArgs: ['hello', 'world'], react: '🔗' }, async (_s, _r, _m, ctx) => ctx.q ? encodeURIComponent(ctx.q) : use(ctx))
cmd({ pattern: 'urldecode', category: 'text', desc: 'URL decode text', usage: 'hello%20world', testArgs: ['hello%20world'], react: '🔗' }, async (_s, _r, _m, ctx) => ctx.q ? decodeURIComponent(ctx.q) : use(ctx))
cmd({ pattern: 'slug', category: 'text', desc: 'Create a URL slug', usage: 'Hello World', testArgs: ['Hello', 'World'], react: '🪶' }, async (_s, _r, _m, ctx) => ctx.q ? ctx.q.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_-]+/g, '-') : use(ctx))
cmd({ pattern: 'camel', category: 'text', desc: 'Create camelCase text', usage: 'hello world', testArgs: ['hello', 'world'], react: '🐪' }, async (_s, _r, _m, ctx) => ctx.q ? words(ctx.q.toLowerCase()).map((word, index) => index ? word[0].toUpperCase() + word.slice(1) : word).join('') : use(ctx))
cmd({ pattern: 'morse', category: 'text', desc: 'Convert text to Morse code', usage: 'SOS', testArgs: ['SOS'], react: '📡' }, async (_s, _r, _m, ctx) => ctx.q ? [...ctx.q.toUpperCase()].map((char) => char === ' ' ? '/' : morse[char] || '?').join(' ') : use(ctx))
