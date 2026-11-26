export const commands = []
const byName = new Map()
const aliases = new Map()

const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '')

export function cmd(info, handler) {
  const name = normalize(info.pattern || info.name)
  if (!name) throw new Error('Command pattern is required')
  if (byName.has(name)) throw new Error(`Duplicate command: ${name}`)

  const aliasList = [...new Set([...(info.aliases || info.alias || info.alise || [])].map(normalize).filter(Boolean))]
  const command = {
    pattern: name,
    aliases: aliasList,
    desc: info.desc || '',
    category: info.category || 'misc',
    usage: info.usage || '',
    react: info.react || '✨',
    owner: Boolean(info.owner || info.fromMe),
    group: Boolean(info.group),
    admin: Boolean(info.admin),
    botAdmin: Boolean(info.botAdmin),
    hidden: Boolean(info.hidden || info.dontAddCommandList),
    testArgs: Array.isArray(info.testArgs) ? info.testArgs : [],
    function: handler
  }

  commands.push(command)
  byName.set(name, command)
  for (const alias of aliasList) aliases.set(alias, name)
  return command
}

export function getCommand(name) {
  const key = normalize(name)
  return byName.get(key) || byName.get(aliases.get(key))
}

export function commandGroups() {
  const groups = {}
  for (const command of commands.filter((item) => !item.hidden)) (groups[command.category] ||= []).push(command)
  return groups
}

export const AddCommand = cmd
export const Function = cmd
export const Module = cmd
