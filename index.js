import { commands } from './command.js'
import { config } from './config.js'
import { startBot } from './lib/bot.js'
import { startDashboard } from './lib/dashboard.js'
import { loadPlugins } from './lib/plugins.js'
import { log, setStatus } from './lib/store.js'

await loadPlugins()
if (commands.length !== 109) throw new Error(`Expected 109 commands, loaded ${commands.length}`)

log('info', `Starting ${config.botName} · ${commands.length}/109 commands loaded`)
setStatus('booting')
startDashboard()

startBot().catch((error) => {
  log('error', `Startup: ${error?.message || error}`)
  setStatus('error', { lastError: String(error?.message || error) })
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log('warn', 'Shutting down...')
    process.exit(0)
  })
}

process.on('unhandledRejection', (reason) => log('error', `Unhandled rejection: ${reason?.message || reason}`))
process.on('uncaughtException', (error) => log('error', `Uncaught exception: ${error?.message || error}`))
