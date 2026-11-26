import { commands } from '../command.js'
import { verifyAllCommands } from '../lib/engine.js'
import { loadPlugins } from '../lib/plugins.js'

await loadPlugins()
const result = await verifyAllCommands()
console.log(JSON.stringify(result, null, 2))
if (commands.length !== 109 || result.total !== 109 || result.passed !== 109) process.exitCode = 1
