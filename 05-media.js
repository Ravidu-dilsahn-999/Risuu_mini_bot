import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import youtubedl from 'youtube-dl-exec'
import { Quality, Ytdl, chooseFormat, parseVideoId } from '@distube/ytdl-core'
import { cmd } from '../command.js'
import { config } from '../config.js'
import { fetchJson, getBuffer, isUrl, streamToBuffer } from '../lib/functions.js'

const usage = (ctx, value) => `Usage: ${ctx.prefix}${ctx.command.pattern} ${value}`
const yt = new Ytdl()

async function youtubeResult(query) {
  if (isUrl(query) && parseVideoId(query)) return { url: query, title: 'YouTube media' }
  const [video] = await yt.search(query, { limit: 5 })
  if (!video) throw new Error('No YouTube results found')
  return video
}

async function gemini(prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`)
  return data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('') || 'No answer returned'
}

async function muxMp4(video, audio) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'risuu-video-'))
  const videoPath = path.join(directory, 'video.mp4')
  const audioPath = path.join(directory, 'audio.m4a')
  const outputPath = path.join(directory, 'output.mp4')
  try {
    await Promise.all([fs.writeFile(videoPath, video), fs.writeFile(audioPath, audio)])
    await new Promise((resolve, reject) => {
      const process = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-i', videoPath, '-i', audioPath, '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', outputPath])
      let error = ''
      process.stderr.on('data', (chunk) => { error += chunk })
      process.once('error', reject)
      process.once('close', (code) => code === 0 ? resolve() : reject(new Error(error || `ffmpeg exited ${code}`)))
    })
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

cmd({ pattern: 'ai', category: 'media', desc: 'Ask Gemini AI', usage: 'question', testArgs: ['What', 'is', 'Node.js?'], react: '🧠' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'question')
  if (ctx.mock) return '🧠 AI preview: your question is ready.'
  if (!config.geminiKey) return '🧠 Add GEMINI_API_KEY to .env to enable AI.'
  return `🧠 *RISUU AI*\n\n${(await gemini(ctx.q)).slice(0, 3500)}`
})

cmd({ pattern: 'song', category: 'media', desc: 'Download YouTube audio', usage: 'song name/link', testArgs: ['sample', 'song'], react: '🎵' }, async (sock, raw, m, ctx) => {
  if (!ctx.q) return usage(ctx, 'song name or YouTube link')
  if (ctx.mock) return '🎵 Audio download pipeline ready.'
  const found = await youtubeResult(ctx.q)
  const info = await yt.getInfo(found.url)
  const format = chooseFormat(info.formats, { quality: Quality.HighestAudio, filter: { hasAudio: true, hasVideo: false } })
  const audio = await streamToBuffer(yt.download(info, { format }))
  await sock.sendMessage(m.chat, { audio, mimetype: format.mimeType?.split(';')[0] || 'audio/webm', fileName: `${info.videoDetails.title}.${format.container || 'webm'}` }, { quoted: raw })
  return `🎵 Sent: *${info.videoDetails.title}*`
})

cmd({ pattern: 'video', category: 'media', desc: 'Download YouTube video', usage: 'video name/link', testArgs: ['sample', 'video'], react: '🎬' }, async (sock, raw, m, ctx) => {
  if (!ctx.q) return usage(ctx, 'video name or YouTube link')
  if (ctx.mock) return '🎬 Video download pipeline ready.'
  const found = await youtubeResult(ctx.q)
  const info = await yt.getInfo(found.url)
  const cap = config.maxDownloadMb * 1024 * 1024
  const videoFormat = info.formats.filter((item) => item.hasVideo && !item.hasAudio && item.container === 'mp4' && item.contentLength && item.contentLength < cap * .85).sort((a, b) => (b.height || 0) - (a.height || 0))[0]
  const audioFormat = info.formats.filter((item) => item.hasAudio && !item.hasVideo && item.container === 'mp4').sort((a, b) => (b.audioBitrate || b.bitrate || 0) - (a.audioBitrate || a.bitrate || 0))[0]
  if (!videoFormat || !audioFormat || videoFormat.contentLength + audioFormat.contentLength > cap) throw new Error(`No MP4 combination under ${config.maxDownloadMb} MB`)
  const [videoOnly, audioOnly] = await Promise.all([
    streamToBuffer(yt.download(info, { format: videoFormat }), cap),
    streamToBuffer(yt.download(info, { format: audioFormat }), cap)
  ])
  const video = await muxMp4(videoOnly, audioOnly)
  await sock.sendMessage(m.chat, { video, mimetype: 'video/mp4', caption: `🎬 *${info.videoDetails.title}*` }, { quoted: raw })
  return null
})

cmd({ pattern: 'fb', aliases: ['facebook'], category: 'media', desc: 'Download a public Facebook video', usage: 'link', testArgs: ['https://facebook.com/video'], react: '📘' }, async (sock, raw, m, ctx) => {
  if (!isUrl(ctx.q)) return usage(ctx, 'Facebook video link')
  if (ctx.mock) return '📘 Facebook download pipeline ready.'
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'risuu-facebook-'))
  const output = path.join(directory, 'facebook.mp4')
  try {
    const info = await youtubedl(ctx.q, { dumpSingleJson: true, noWarnings: true, noPlaylist: true, noCheckCertificates: true })
    await youtubedl(ctx.q, { output, format: 'best[ext=mp4]/best', noWarnings: true, noPlaylist: true, noCheckCertificates: true, maxFilesize: `${config.maxDownloadMb}M` })
    const video = await fs.readFile(output)
    if (video.length > config.maxDownloadMb * 1024 * 1024) throw new Error(`File is larger than ${config.maxDownloadMb} MB`)
    await sock.sendMessage(m.chat, { video, mimetype: 'video/mp4', caption: `📘 *${info.title || 'Facebook video'}*` }, { quoted: raw })
    return null
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

cmd({ pattern: 'sticker', aliases: ['s'], category: 'media', desc: 'Image to sticker', usage: 'reply to image', react: '🧩' }, async (sock, raw, m, ctx) => {
  if (ctx.mock) return '🧩 Sticker conversion ready.'
  const media = await m.download()
  const sticker = await sharp(media).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer()
  await sock.sendMessage(m.chat, { sticker }, { quoted: raw })
  return null
})

cmd({ pattern: 'img', aliases: ['toimg'], category: 'media', desc: 'Sticker to PNG image', usage: 'reply to sticker', react: '🖼️' }, async (sock, raw, m, ctx) => {
  if (ctx.mock) return '🖼️ Image conversion ready.'
  const media = await m.download()
  const image = await sharp(media).png().toBuffer()
  await sock.sendMessage(m.chat, { image, caption: '🖼️ Converted by RISUU' }, { quoted: raw })
  return null
})

cmd({ pattern: 'tr', aliases: ['translate'], category: 'media', desc: 'Translate text', usage: 'si hello', testArgs: ['si', 'hello'], react: '🌐' }, async (_s, _r, _m, ctx) => {
  const language = ctx.args[0]; const text = ctx.args.slice(1).join(' ')
  if (!language || !text) return usage(ctx, 'si hello world')
  if (ctx.mock) return '🌐 ආයුබෝවන් ලෝකය'
  const data = await fetchJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(text)}`)
  return `🌐 ${data?.[0]?.map((item) => item[0]).join('') || 'Translation unavailable'}`
})

cmd({ pattern: 'tts', category: 'media', desc: 'Text to speech', usage: 'en hello', testArgs: ['en', 'hello'], react: '🔊' }, async (sock, raw, m, ctx) => {
  const language = ctx.args[0] || 'en'; const text = ctx.args.slice(1).join(' ')
  if (!text) return usage(ctx, 'en hello world')
  if (ctx.mock) return '🔊 Speech generation ready.'
  const audio = await getBuffer(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(language)}&q=${encodeURIComponent(text.slice(0, 200))}`)
  await sock.sendMessage(m.chat, { audio, mimetype: 'audio/mpeg', ptt: true }, { quoted: raw })
  return null
})

cmd({ pattern: 'ytsearch', aliases: ['yts'], category: 'media', desc: 'Search YouTube', usage: 'query', testArgs: ['Node.js'], react: '🔎' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'search query')
  if (ctx.mock) return '🔎 YouTube search preview ready.'
  const results = await yt.search(ctx.q, { limit: 5 })
  const list = results.map((item, index) => `${index + 1}. *${item.title}*\n${item.duration || ''} · ${item.author?.name || item.channel?.name || ''}\n${item.url || `https://www.youtube.com/watch?v=${item.id}`}`)
  return `🔎 *YOUTUBE RESULTS*\n\n${list.join('\n\n') || 'No results'}`
})

cmd({ pattern: 'weather', category: 'media', desc: 'Current weather by city', usage: 'Colombo', testArgs: ['Colombo'], react: '🌦️' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'Colombo')
  if (ctx.mock) return '🌦️ Colombo · 29°C · Wind 12 km/h'
  const place = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ctx.q)}&count=1`)
  const city = place.results?.[0]
  if (!city) throw new Error('City not found')
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code`)
  return `🌦️ *${city.name}, ${city.country || ''}*\nTemperature: ${data.current?.temperature_2m}°C\nFeels like: ${data.current?.apparent_temperature}°C\nWind: ${data.current?.wind_speed_10m} km/h\nWeather code: ${data.current?.weather_code}`
})

cmd({ pattern: 'define', aliases: ['dictionary'], category: 'media', desc: 'English dictionary lookup', usage: 'hello', testArgs: ['hello'], react: '📖' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'word')
  if (ctx.mock) return '📖 hello · a greeting'
  const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(ctx.q)}`)
  const entry = data?.[0]; const meaning = entry?.meanings?.[0]
  return `📖 *${entry?.word || ctx.q}* ${entry?.phonetic || ''}\n${meaning?.partOfSpeech || ''}: ${meaning?.definitions?.[0]?.definition || 'Definition unavailable'}`
})

cmd({ pattern: 'lyrics', category: 'media', desc: 'Find song lyrics', usage: 'artist|title', testArgs: ['Adele|Hello'], react: '🎤' }, async (_s, _r, _m, ctx) => {
  const [artist, title] = ctx.q.split('|').map((value) => value?.trim())
  if (!artist || !title) return usage(ctx, 'artist|song title')
  if (ctx.mock) return '🎤 Lyrics search preview ready.'
  const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)
  return `🎤 *${artist} — ${title}*\n\n${String(data.lyrics || 'Lyrics unavailable').slice(0, 3500)}`
})

cmd({ pattern: 'github', category: 'media', desc: 'GitHub user information', usage: 'username', testArgs: ['octocat'], react: '🐙' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'username')
  if (ctx.mock) return '🐙 octocat · GitHub profile preview'
  const user = await fetchJson(`https://api.github.com/users/${encodeURIComponent(ctx.q)}`)
  return `🐙 *${user.name || user.login}*\n@${user.login}\nRepos: ${user.public_repos} · Followers: ${user.followers}\n${user.bio || ''}\n${user.html_url}`
})

cmd({ pattern: 'npm', category: 'media', desc: 'NPM package information', usage: 'express', testArgs: ['express'], react: '📦' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'package-name')
  if (ctx.mock) return '📦 express · package preview'
  const data = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(ctx.q)}/latest`)
  return `📦 *${data.name}@${data.version}*\n${data.description || ''}\n${data.homepage || `https://npmjs.com/package/${data.name}`}`
})

cmd({ pattern: 'wiki', category: 'media', desc: 'Wikipedia summary', usage: 'Sri Lanka', testArgs: ['Sri', 'Lanka'], react: '🌍' }, async (_s, _r, _m, ctx) => {
  if (!ctx.q) return usage(ctx, 'topic')
  if (ctx.mock) return '🌍 Wikipedia summary preview ready.'
  const search = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(ctx.q)}&format=json&origin=*`)
  const title = search.query?.search?.[0]?.title
  if (!title) throw new Error('Wikipedia article not found')
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  return `🌍 *${data.title}*\n\n${String(data.extract || '').slice(0, 3200)}\n${data.content_urls?.desktop?.page || ''}`
})
