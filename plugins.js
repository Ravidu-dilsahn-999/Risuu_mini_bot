import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { config } from '../config.js'

let loaded = false

export async function loadPlugins() {
  if (loaded) return
  const directory = path.join(config.root, 'plugins')
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.js')).sort()
  for (const file of files) await import(pathToFileURL(path.join(directory, file)).href)
  loaded = true
}
