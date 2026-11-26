import express from 'express'
import { commands } from '../command.js'
import { config } from '../config.js'
import { getSocket, requestPair, restartBot, sendToChat } from './bot.js'
import { previewCommand, verifyAllCommands } from './engine.js'
import { bus, log, publicState, publish, state } from './store.js'

export function startDashboard() {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  app.use(express.static(config.publicDir))

  app.get('/api/state', (_req, res) => res.json({ ...publicState(), botName: config.botName, commandCount: commands.length, demo: config.demo }))
  app.get('/api/health', (_req, res) => res.json({ ok: true, status: state.status, commands: commands.length, uptime: Date.now() - state.startedAt }))

  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' })
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    send('state', { ...publicState(), botName: config.botName, commandCount: commands.length, demo: config.demo })
    const onState = () => send('state', { ...publicState(), botName: config.botName, commandCount: commands.length, demo: config.demo })
    const onLog = (entry) => send('log', entry)
    bus.on('change', onState); bus.on('log', onLog)
    const heartbeat = setInterval(() => res.write(': risuu\n\n'), 20_000)
    req.on('close', () => { clearInterval(heartbeat); bus.off('change', onState); bus.off('log', onLog) })
  })

  app.get('/api/commands', (req, res) => {
    const category = String(req.query.category || '').toLowerCase()
    const query = String(req.query.q || '').toLowerCase()
    let list = commands.filter((item) => !item.hidden)
    if (category && category !== 'all') list = list.filter((item) => item.category === category)
    if (query) list = list.filter((item) => item.pattern.includes(query) || item.desc.toLowerCase().includes(query))
    res.json({ total: list.length, commands: list.map(({ function: _function, ...item }) => item) })
  })

  app.post('/api/pair', async (req, res) => {
    try { res.json({ ok: true, ...(await requestPair(req.body?.number)) }) }
    catch (error) { res.status(400).json({ ok: false, error: error?.message || String(error) }) }
  })

  app.post('/api/send', async (req, res) => {
    try {
      let jid = String(req.body?.jid || '').trim()
      if (jid && !jid.includes('@')) jid = `${jid.replace(/\D/g, '')}@s.whatsapp.net`
      res.json({ ok: true, ...(await sendToChat(jid, req.body?.text)) })
    } catch (error) { res.status(400).json({ ok: false, error: error?.message || String(error) }) }
  })

  app.get('/api/preview', async (req, res) => {
    const args = String(req.query.args || '').split(/\s+/).filter(Boolean)
    res.json(await previewCommand(String(req.query.name || ''), args))
  })
  app.get('/api/verify', async (_req, res) => {
    const result = await verifyAllCommands()
    log(result.failures.length ? 'warn' : 'ok', `Command verification: ${result.passed}/${result.total}`)
    res.json(result)
  })

  app.post('/api/settings', (req, res) => {
    const body = req.body || {}
    if (typeof body.animations === 'boolean') state.settings.animations = body.animations
    if (typeof body.welcome === 'boolean') state.settings.welcome = body.welcome
    if (typeof body.autoRead === 'boolean') state.settings.autoRead = body.autoRead
    if (typeof body.autoStatusRead === 'boolean') state.settings.autoStatusRead = body.autoStatusRead
    if (typeof body.prefix === 'string' && body.prefix.trim()) state.settings.prefix = config.prefix = body.prefix.trim().slice(0, 3)
    if (['public', 'private', 'groups', 'inbox'].includes(body.mode)) state.settings.mode = config.mode = body.mode
    publish()
    res.json({ ok: true, settings: state.settings })
  })

  app.post('/api/restart', async (_req, res) => {
    try { await restartBot(); res.json({ ok: true, status: state.status }) }
    catch (error) { res.status(500).json({ ok: false, error: error?.message || String(error) }) }
  })

  app.get('/api/socket', (_req, res) => res.json({ connected: Boolean(getSocket() && state.connected) }))

  const server = app.listen(config.port, '0.0.0.0', () => log('ok', `Dashboard ready on http://0.0.0.0:${config.port}`))
  return server
}
