const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]
let current = { uptime: 0, settings: {} }
let commands = []
let category = 'all'
let settingTimer

const titles = { home: 'System Online', connect: 'Link WhatsApp', commands: '109 Command Matrix', lab: 'Command Test Lab', settings: 'Runtime Settings', logs: 'Live Runtime Logs' }

function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.add('show')
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200)
}

function showView(name) {
  document.body.dataset.view = name
  $$('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === name))
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`))
  $('#crumb').textContent = name.toUpperCase(); $('#pageTitle').textContent = titles[name] || name
}

$('#nav').addEventListener('click', (event) => { const button = event.target.closest('.nav-btn'); if (button) showView(button.dataset.view) })
$$('[data-go]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.go)))

async function api(url, options = {}) {
  const response = await fetch(url, options); const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

function uptime(ms) {
  let seconds = Math.max(0, Math.floor(ms / 1000)); const days = Math.floor(seconds / 86400); seconds %= 86400; const hours = Math.floor(seconds / 3600); seconds %= 3600; const minutes = Math.floor(seconds / 60); seconds %= 60
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds}s`
}

function applyState(data) {
  current = data; document.body.dataset.status = data.status || 'unknown'
  $('#status').className = `status ${data.status || ''}`; $('#statusText').textContent = ({ booting: 'Booting', demo: 'Demo mode', connected: 'Connected', waiting_for_scan: 'Pairing', reconnecting: 'Reconnecting', logged_out: 'Logged out', error: 'Error' })[data.status] || data.status
  $('#uptime').textContent = uptime(data.uptime || 0); $('#metricUptime').textContent = uptime(data.uptime || 0)
  $('#metricCommands').textContent = data.commandCount || 109; $('#metricMessages').textContent = data.messages || 0; $('#metricRuns').textContent = data.commandRuns || 0
  $('#sideCount').textContent = `${data.commandCount || 109}/109`; if (data.waVersion) $('#waVersion').textContent = data.waVersion
  $('#prefix').textContent = data.settings?.prefix || '.'; $('#setPrefix').value = data.settings?.prefix || '.'; $('#mode').value = data.settings?.mode || 'public'
  $('#animations').checked = data.settings?.animations !== false; $('#welcome').checked = data.settings?.welcome !== false; $('#autoRead').checked = Boolean(data.settings?.autoRead); $('#autoStatusRead').checked = Boolean(data.settings?.autoStatusRead)
  if (data.pairNumber && !$('#phone').value) $('#phone').value = data.pairNumber
  if (data.pairCode) { $('#pairCode').textContent = data.pairCode.split('').join(' '); $('#pairHint').textContent = 'Enter this in WhatsApp' }
  else if (data.connected) { $('#pairCode').textContent = 'C O N N E C T E D'; $('#pairHint').textContent = data.botNumber || '' }
  if (data.qr) { $('#qr').src = data.qr; $('#qr').style.display = 'block'; $('#qrEmpty').style.display = 'none' }
  else { $('#qr').style.display = 'none'; $('#qrEmpty').style.display = ''; $('#qrEmpty').textContent = data.connected ? 'Connected ✓' : 'QR will appear here' }
}

function addLog(entry) {
  const row = document.createElement('div'); row.className = `log ${entry.level || 'info'}`; row.innerHTML = '<time></time><span></span>'
  row.querySelector('time').textContent = new Date(entry.at).toLocaleTimeString('en-GB', { hour12: false }); row.querySelector('span').textContent = entry.message
  for (const target of [$('#homeLogs'), $('#logs')]) { target.prepend(row.cloneNode(true)); while (target.children.length > 120) target.lastChild.remove() }
}

function connectEvents() {
  const events = new EventSource('/api/events')
  events.addEventListener('state', (event) => applyState(JSON.parse(event.data)))
  events.addEventListener('log', (event) => addLog(JSON.parse(event.data)))
  events.onerror = () => toast('Live stream reconnecting...')
}

function renderCommands() {
  const query = $('#search').value.toLowerCase().trim()
  const list = commands.filter((item) => (category === 'all' || item.category === category) && (!query || item.pattern.includes(query) || item.desc.toLowerCase().includes(query)))
  $('#commandGrid').innerHTML = ''
  list.forEach((item, index) => {
    const card = document.createElement('button'); card.className = 'command'; card.style.setProperty('--delay', `${Math.min(index % 20, 19) * 22}ms`)
    card.innerHTML = '<b></b><p></p><small></small>'; card.querySelector('b').textContent = `${current.settings?.prefix || '.'}${item.pattern}`; card.querySelector('p').textContent = item.desc; card.querySelector('small').textContent = item.category
    card.addEventListener('click', () => { showView('lab'); $('#labCommand').value = item.pattern; $('#labArgs').value = item.testArgs?.join(' ') || ''; toast(`${item.pattern} loaded into Test Lab`) })
    $('#commandGrid').appendChild(card)
  })
}

async function loadCommands() {
  const data = await api('/api/commands'); commands = data.commands; $('#commandTotal').textContent = `${data.total}/109`
  const categories = ['all', ...new Set(commands.map((item) => item.category))]; $('#chips').innerHTML = ''
  categories.forEach((name) => { const button = document.createElement('button'); button.textContent = `${name} ${name === 'all' ? commands.length : commands.filter((item) => item.category === name).length}`; button.className = name === category ? 'active' : ''; button.addEventListener('click', () => { category = name; $$('#chips button').forEach((b) => b.classList.toggle('active', b === button)); renderCommands() }); $('#chips').appendChild(button) })
  renderCommands()
}
$('#search').addEventListener('input', renderCommands)

$('#pairBtn').addEventListener('click', async () => { try { const result = await api('/api/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: $('#phone').value }) }); toast(result.pending ? 'Number saved; waiting for socket...' : result.alreadyRegistered ? 'Already connected' : `Pairing code: ${result.code}`) } catch (error) { toast(error.message) } })
$('#sendBtn').addEventListener('click', async () => { try { const result = await api('/api/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jid: $('#sendJid').value, text: $('#sendText').value }) }); toast(result.demo ? 'Demo message logged' : 'Message sent') } catch (error) { toast(error.message) } })

async function runPreview() {
  const name = $('#labCommand').value.trim(); if (!name) return toast('Enter a command')
  $('#preview').innerHTML = '<p class="loading">Rendering command...</p>'
  try { const data = await api(`/api/preview?name=${encodeURIComponent(name)}&args=${encodeURIComponent($('#labArgs').value)}`); if (data.error) throw new Error(data.error); $('#preview').innerHTML = ''; data.messages.forEach((message) => { const bubble = document.createElement('div'); bubble.className = `bubble ${message.type}`; bubble.textContent = message.text || `[${message.type}]`; $('#preview').appendChild(bubble) }); toast(`${data.command} passed`) } catch (error) { $('#preview').innerHTML = `<p>${error.message}</p>` }
}
$('#runBtn').addEventListener('click', runPreview); $('#labArgs').addEventListener('keydown', (event) => { if (event.key === 'Enter') runPreview() })
$('#verifyBtn').addEventListener('click', async () => { $('#verifyText').textContent = 'Running all 109 handlers...'; $('#verifyFill').style.width = '15%'; try { const result = await api('/api/verify'); $('#verifyFill').style.width = `${(result.passed / result.total) * 100}%`; $('#verifyText').textContent = result.failures.length ? `${result.passed}/${result.total} passed · ${result.failures.map((item) => item.name).join(', ')}` : `✓ ${result.passed}/${result.total} commands passed`; toast('Verification complete') } catch (error) { $('#verifyText').textContent = error.message } })

async function saveSettings() {
  try { await api('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ animations: $('#animations').checked, welcome: $('#welcome').checked, autoRead: $('#autoRead').checked, autoStatusRead: $('#autoStatusRead').checked, prefix: $('#setPrefix').value || '.', mode: $('#mode').value }) }); toast('Settings updated') } catch (error) { toast(error.message) }
}
$$('#view-settings input, #view-settings select').forEach((input) => input.addEventListener('change', () => { clearTimeout(settingTimer); settingTimer = setTimeout(saveSettings, 250) }))
$('#restartBtn').addEventListener('click', async () => { try { toast('Restarting connection...'); await api('/api/restart', { method: 'POST' }) } catch (error) { toast(error.message) } })

setInterval(() => { current.uptime = (current.uptime || 0) + 1000; $('#uptime').textContent = uptime(current.uptime); $('#metricUptime').textContent = uptime(current.uptime) }, 1000)
connectEvents(); loadCommands().catch((error) => toast(error.message))
