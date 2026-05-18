import { createClient } from '@supabase/supabase-js'
import './style.css'

// ========== CONFIG ==========
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ========== SESSIONS DATA ==========
function defaultSessions() {
  return {
    A: {
      name: 'Sessione A — Qualità esplosiva',
      exercises: [
        { id:'mobA',   name:'Mobilità polsi quotidiana',       desc:'circle lenti + stretch in estensione (30-60s)',  type:'single', mobility:true, fields:['min','note'],      target:'1-2 min, ogni giorno' },
        { id:'explA',  name:'Pull-up esplosivi al petto',      desc:'solo rep di qualità — se cali al mento, stop',  type:'sets',   fields:['rip','note'],          target:'4×3, rec 3 min' },
        { id:'zavorA', name:'Pull-up zavorrati lenti',         desc:'eccentrica 4 sec',                              type:'sets',   fields:['rip','kg','note'],      target:'3×5 con 5–7.5 kg' },
        { id:'fgripA', name:'False grip hang',                 desc:'polso sopra la sbarra',                         type:'sets',   fields:['sec','note'],           target:'3×20 sec' },
      ]
    },
    B: {
      name: 'Sessione B — Range e volume',
      exercises: [
        { id:'mobB',    name:'Mobilità polsi quotidiana',          desc:'circle lenti + stretch in estensione (30-60s)',       type:'single', mobility:true, fields:['min','note'],          target:'1-2 min, ogni giorno' },
        { id:'explB',   name:'Pull-up esplosivi assistiti (loop)', desc:"obiettivo: arrivare all'addome su tutte le rep",      type:'sets',   fields:['rip','loop','note'],    target:'4×4, rec 2 min' },
        { id:'pikeB',   name:'Pike push up (piedi sul letto)',     desc:'busto verticale, fai i circle prima!',               type:'sets',   fields:['rip','note'],           target:'3×8–10, rec 90 sec' },
        { id:'wcurlB',  name:'Wrist curl (loop)',                  desc:'palmo in su, lento in eccentrica',                   type:'sets',   fields:['rip','loop','note'],    target:'3×15–20' },
        { id:'wextB',   name:'Wrist extension (loop)',             desc:'palmo in giù, lento in eccentrica',                  type:'sets',   fields:['rip','loop','note'],    target:'3×15–20' },
        { id:'mobBend', name:'Stretching polsi (defaticamento)',   desc:'passive, in estensione e flessione',                 type:'single', fields:['min','note'],           target:'2-3 min' },
      ]
    },
    C: {
      name: 'Sessione C — Forza base',
      exercises: [
        { id:'mobC',    name:'Mobilità polsi quotidiana',   desc:'circle lenti + stretch in estensione (30-60s)', type:'single', mobility:true, fields:['min','note'],      target:'1-2 min, ogni giorno' },
        { id:'zavorC',  name:'Pull-up zavorrati',           desc:'massimale del giorno',                          type:'sets',   fields:['rip','kg','note'],      target:'5×4 con 7.5–10 kg' },
        { id:'pausaC',  name:'Pull-up con pausa al mento',  desc:'tieni 2 sec in cima',                           type:'sets',   fields:['rip','note'],           target:'3×4' },
        { id:'hollowC', name:'Hollow body hold',            desc:'core specifico per muscle up',                  type:'sets',   fields:['sec','note'],           target:'3×30 sec' },
        { id:'dipC',    name:'Dip profondi',                desc:'simula la fase finale del muscle up',           type:'sets',   fields:['rip','kg','note'],      target:'3×8' },
      ]
    }
  }
}

const FIELD_LABELS = { rip:'rip', kg:'kg', sec:'sec', loop:'loop mm', min:'min', note:'note' }

// ========== STATE ==========
let SESSIONS = defaultSessions()
let currentSession = 'A'
let currentView = 'workout'
let logs = []
let pullupData = {}
let pullupIds = {}
let pullupSaveTimer = null
let editingSessions = null
let editorCurrentSession = 'A'
let currentUser = null
let dataLoaded = false

// ========== INIT ==========
document.getElementById('log-date').value = new Date().toISOString().slice(0, 10)
updatePullupDisplay()
renderForm()

// ========== TOAST ==========
function toast(msg, isErr) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.toggle('err', !!isErr)
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2400)
}

// ========== SYNC STATUS ==========
function setSync(state, label) {
  document.getElementById('sync-dot').className = 'sync-dot' + (state ? ' ' + state : '')
  document.getElementById('sync-label').textContent = label
}

// ========== AUTH ==========
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
    if (dataLoaded && currentUser?.id === session.user.id) return
    currentUser = session.user
    dataLoaded = false
    setupAuthUI(true)
    await loadData()
    dataLoaded = true
  } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
    currentUser = null
    dataLoaded = false
    setupAuthUI(false)
    setSync('', 'non connesso')
  }
})

function setupAuthUI(loggedIn) {
  document.getElementById('signin-btn').style.display = loggedIn ? 'none' : ''
  document.getElementById('signout-btn')?.remove()
  document.getElementById('edit-sessions-btn')?.remove()

  if (loggedIn) {
    const btnOut = document.createElement('button')
    btnOut.id = 'signout-btn'
    btnOut.className = 'signout-btn'
    btnOut.textContent = 'logout'
    btnOut.onclick = handleSignOut
    document.getElementById('sync-pod').appendChild(btnOut)

    const btnEdit = document.createElement('button')
    btnEdit.id = 'edit-sessions-btn'
    btnEdit.className = 'edit-sessions-btn'
    btnEdit.textContent = '⚙ sessioni'
    btnEdit.onclick = openEditor
    document.getElementById('sync-pod').appendChild(btnEdit)

    document.getElementById('bottom-nav').style.display = 'flex'
  } else {
    document.getElementById('bottom-nav').style.display = 'none'
    switchView('workout')
    logs = []
    pullupData = {}
    pullupIds = {}
    SESSIONS = defaultSessions()
    document.getElementById('history-list').innerHTML = '<div class="history-empty">accedi con Google per vedere lo storico</div>'
  }
}

async function handleSignIn() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  })
}

async function handleSignOut() {
  await supabase.auth.signOut()
}

// ========== SUPABASE DATA ==========
async function loadData() {
  setSync('loading', 'caricamento...')
  try {
    const { data: sessRow } = await supabase
      .from('sessions_config')
      .select('data')
      .eq('user_id', currentUser.id)
      .maybeSingle()
    if (sessRow) SESSIONS = sessRow.data

    const { data: allLogs, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
    if (error) throw error

    logs = allLogs.filter(l => !l.type)
    pullupData = {}
    pullupIds = {}
    allLogs.filter(l => l.type === 'pullups').forEach(l => {
      pullupData[l.date] = l.count
      pullupIds[l.date] = l.id
    })

    // merge today's localStorage count if not yet in DB
    const today = new Date().toISOString().slice(0, 10)
    if (pullupData[today] === undefined) {
      const lsDate = localStorage.getItem('pullup_date')
      const lsCount = parseInt(localStorage.getItem('pullup_count') || '0')
      if (lsDate === today && lsCount > 0) pullupData[today] = lsCount
    }

    setSync('ok', 'sincronizzato')
    updatePullupDisplay()
    renderForm()
    renderHistory()
  } catch (e) {
    console.error(e)
    setSync('err', 'errore connessione')
    toast('Errore: ' + e.message, true)
  }
}

async function saveLog() {
  if (!currentUser) { toast('Accedi con Google prima di salvare', true); return }
  const date = document.getElementById('log-date').value || new Date().toISOString().slice(0, 10)
  const exercises = collectFormData()
  if (!exercises.length) { toast('Inserisci almeno un dato', true); return }

  const btn = document.getElementById('save-btn')
  btn.disabled = true
  btn.textContent = 'Salvataggio...'
  setSync('loading', 'salvataggio...')

  const { data, error } = await supabase
    .from('logs')
    .insert({ user_id: currentUser.id, date, session: currentSession, exercises })
    .select()
    .single()

  if (error) {
    setSync('err', 'errore salvataggio')
    toast('Errore: ' + error.message, true)
  } else {
    logs.unshift(data)
    setSync('ok', 'sincronizzato')
    toast('Sessione salvata')
    renderHistory()
    renderForm()
  }
  btn.disabled = false
  btn.textContent = 'Salva sessione'
}

async function deleteLog(id) {
  if (!currentUser) return
  if (!confirm('Eliminare questa sessione?')) return
  setSync('loading', 'eliminazione...')
  const { error } = await supabase.from('logs').delete().eq('id', id)
  if (error) {
    setSync('err', 'errore')
    toast('Errore eliminazione', true)
  } else {
    logs = logs.filter(l => l.id !== id)
    setSync('ok', 'sincronizzato')
    renderHistory()
    toast('Sessione eliminata')
  }
}

async function writePullupEntry(date, count) {
  if (!currentUser) return
  const existingId = pullupIds[date]
  if (existingId) {
    const { error } = await supabase.from('logs').update({ count }).eq('id', existingId)
    if (error) console.error('pullup update:', error)
  } else {
    const { data, error } = await supabase
      .from('logs')
      .insert({ user_id: currentUser.id, date, type: 'pullups', count })
      .select()
      .single()
    if (error) console.error('pullup insert:', error)
    else pullupIds[date] = data.id
  }
}

async function saveSessionsConfig() {
  if (!currentUser) throw new Error('Non autenticato')
  const { error } = await supabase.from('sessions_config').upsert(
    { user_id: currentUser.id, data: SESSIONS, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

// ========== PULL-UP COUNTER ==========
function getSelectedDate() {
  return document.getElementById('log-date').value || new Date().toISOString().slice(0, 10)
}

function updatePullupDisplay() {
  const date = getSelectedDate()
  const today = new Date().toISOString().slice(0, 10)
  const count = pullupData[date] || 0
  document.getElementById('pullup-count').textContent = count
  const label = date === today
    ? 'pull-up oggi'
    : 'pull-up ' + new Date(date + 'T12:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'short' })
  document.getElementById('pullup-label').textContent = label
  if (date === today) {
    localStorage.setItem('pullup_date', today)
    localStorage.setItem('pullup_count', String(count))
  }
}

function addPullups(direction) {
  const date = getSelectedDate()
  const next = Math.max(0, (pullupData[date] || 0) + direction)
  pullupData[date] = next
  document.getElementById('pullup-count').textContent = next
  const today = new Date().toISOString().slice(0, 10)
  if (date === today) {
    localStorage.setItem('pullup_date', today)
    localStorage.setItem('pullup_count', String(next))
  }
  if (currentUser) {
    clearTimeout(pullupSaveTimer)
    pullupSaveTimer = setTimeout(() => writePullupEntry(date, next), 1500)
  }
}

// ========== VIEW SWITCHER ==========
function switchView(v) {
  currentView = v
  document.getElementById('view-workout').style.display = v === 'workout' ? '' : 'none'
  document.getElementById('view-history').style.display = v === 'history' ? '' : 'none'
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v))
  if (v === 'history') renderHistory()
}

// ========== UI RENDERING ==========
function switchSession(s) {
  currentSession = s
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.session === s))
  renderForm()
}

function buildSetRow(ex, i) {
  const nonNote = ex.fields.filter(f => f !== 'note')
  const inputs = nonNote.map(f =>
    `<input type="number" step="any" class="set-input" placeholder="${FIELD_LABELS[f]}" id="${ex.id}-s${i}-${f}">`
  ).join('')
  return `<div class="set-row" id="row-${ex.id}-${i}">
    <span class="set-label">s${i+1}</span>
    ${inputs}
    <input type="text" class="set-input note" placeholder="note" id="${ex.id}-s${i}-note">
    <button class="del-btn" onclick="removeSet('${ex.id}',${i})" aria-label="rimuovi">×</button>
  </div>`
}

function renderForm() {
  const sess = SESSIONS[currentSession]
  const c = document.getElementById('exercises-container')
  c.innerHTML = ''
  sess.exercises.forEach(ex => {
    const card = document.createElement('div')
    card.className = 'ex-card' + (ex.mobility ? ' mobility' : '')
    const def = ex.target.startsWith('4') ? 4 : ex.target.startsWith('5') ? 5 : 3
    let body = ''
    if (ex.type === 'sets') {
      let rows = ''
      for (let i = 0; i < def; i++) rows += buildSetRow(ex, i)
      body = `<div class="sets-list" id="sets-${ex.id}">${rows}</div>
        <button class="add-set" onclick="addSet('${ex.id}')">+ aggiungi serie</button>`
    } else {
      const flds = ex.fields.map(f =>
        f === 'note'
          ? `<div class="field full"><label>note</label><textarea class="set-textarea" id="${ex.id}-note" placeholder="..."></textarea></div>`
          : `<div class="field"><label>${FIELD_LABELS[f]}</label><input type="number" step="any" class="set-input" style="width:100%" id="${ex.id}-${f}" placeholder="—"></div>`
      ).join('')
      body = `<div class="single-fields">${flds}</div>`
    }
    card.innerHTML = `
      <div class="ex-header">
        <div class="ex-tag">${ex.mobility ? 'mobilità • daily' : 'esercizio'}</div>
        <div class="ex-name">${ex.name}</div>
        <div class="ex-desc">${ex.desc}</div>
        <div class="ex-target">${ex.target}</div>
      </div>${body}`
    c.appendChild(card)
  })
}

function addSet(exId) {
  const cont = document.getElementById('sets-' + exId)
  const count = cont.querySelectorAll('.set-row').length
  const ex = Object.values(SESSIONS).flatMap(s => s.exercises).find(e => e.id === exId)
  cont.insertAdjacentHTML('beforeend', buildSetRow(ex, count))
}

function removeSet(exId, idx) {
  document.getElementById(`row-${exId}-${idx}`)?.remove()
  const cont = document.getElementById('sets-' + exId)
  if (cont) cont.querySelectorAll('.set-row').forEach((row, i) => {
    row.querySelector('.set-label').textContent = 's' + (i + 1)
  })
}

function collectFormData() {
  const sess = SESSIONS[currentSession]
  return sess.exercises.map(ex => {
    const entry = { id: ex.id, name: ex.name, sets: [] }
    if (ex.type === 'sets') {
      const cont = document.getElementById('sets-' + ex.id)
      if (!cont) return null
      cont.querySelectorAll('.set-row').forEach((row, i) => {
        const set = {}
        ex.fields.forEach(f => {
          const el = document.getElementById(`${ex.id}-s${i}-${f}`)
          if (el && el.value.trim()) set[f] = el.value.trim()
        })
        if (Object.keys(set).length) entry.sets.push(set)
      })
    } else {
      const set = {}
      ex.fields.forEach(f => {
        const el = document.getElementById(`${ex.id}-${f}`)
        if (el && el.value.trim()) set[f] = el.value.trim()
      })
      if (Object.keys(set).length) entry.sets.push(set)
    }
    return entry.sets.length ? entry : null
  }).filter(Boolean)
}

function formatSet(s) {
  const p = []
  if (s.rip)  p.push(s.rip + ' rip')
  if (s.sec)  p.push(s.sec + ' sec')
  if (s.min)  p.push(s.min + ' min')
  if (s.kg)   p.push(s.kg + ' kg')
  if (s.loop) p.push('loop ' + s.loop)
  if (s.note) p.push('<em>' + s.note + '</em>')
  return p.join(' · ')
}

function renderHistory() {
  const list = document.getElementById('history-list')
  const allDates = new Set([...logs.map(l => l.date), ...Object.keys(pullupData)])
  if (!allDates.size) {
    list.innerHTML = '<div class="history-empty">nessuna sessione salvata ancora</div>'
    return
  }
  const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a))
  list.innerHTML = sortedDates.map(date => {
    const dayLogs = logs.filter(l => l.date === date && !l.type).sort((a, b) => b.created_at?.localeCompare(a.created_at))
    const pullups = pullupData[date]
    const d = new Date(date + 'T12:00:00')
    const ds = d.toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
    const pullupBadge = pullups ? `<span class="pullup-day-badge">${pullups} pull-up</span>` : ''
    const sessions = dayLogs.map(log => `
      <div class="log">
        <div class="log-head">
          <span class="log-badge badge-${log.session}">sess. ${log.session}</span>
          <button class="log-del" onclick="deleteLog('${log.id}')" aria-label="elimina">×</button>
        </div>
        ${(log.exercises || []).map(ex => `
          <div class="log-ex">
            <div class="log-ex-name">${ex.name}</div>
            <div class="log-sets">${(ex.sets || []).map((s, i) => `<span class="log-set">s${i+1}: ${formatSet(s)}</span>`).join('')}</div>
          </div>`).join('')}
      </div>`).join('')
    return `
      <div class="history-day">
        <div class="history-day-header">
          <span class="history-day-date">${ds}</span>
          ${pullupBadge}
        </div>
        ${sessions}
      </div>`
  }).join('')
}

// ========== SESSION EDITOR ==========
function openEditor() {
  editingSessions = JSON.parse(JSON.stringify(SESSIONS))
  editorCurrentSession = 'A'
  renderEditorSession('A')
  document.getElementById('editor-overlay').style.display = 'flex'
}

function closeEditor() {
  document.getElementById('editor-overlay').style.display = 'none'
}

function closeEditorIfOverlay(e) {
  if (e.target === document.getElementById('editor-overlay')) closeEditor()
}

function switchEditorSession(s) {
  const nameInput = document.getElementById('editor-session-name')
  if (nameInput) editingSessions[editorCurrentSession].name = nameInput.value
  renderEditorSession(s)
}

function renderEditorSession(s) {
  editorCurrentSession = s
  document.querySelectorAll('.editor-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.sess === s)
  )
  document.getElementById('editor-session-name').value = editingSessions[s].name
  document.getElementById('editor-exercises-list').innerHTML =
    editingSessions[s].exercises.map(ex => `
      <div class="editor-ex-item">
        <div class="editor-ex-info">
          <span class="editor-ex-name">${ex.name}</span>
          <span class="editor-ex-meta">${ex.type} · ${ex.fields.join(', ')}</span>
        </div>
        <div class="editor-ex-actions">
          <button class="editor-ex-btn" onclick="editExercise('${ex.id}')">✏</button>
          <button class="editor-ex-btn danger" onclick="deleteExercise('${ex.id}')">✕</button>
        </div>
      </div>`).join('')
  hideExForm()
}

function hideExForm() {
  const f = document.getElementById('editor-ex-form')
  f.style.display = 'none'
  f.innerHTML = ''
}

function showExForm(ex) {
  const allFields = ['rip','kg','sec','loop','min','note']
  const form = document.getElementById('editor-ex-form')
  form.style.display = 'block'
  form.innerHTML = `
    <div class="ex-form-grid">
      <div class="ex-form-field">
        <label>Nome</label>
        <input type="text" id="exf-name" class="editor-input" value="${ex ? ex.name : ''}" placeholder="es. Pull-up esplosivi">
      </div>
      <div class="ex-form-field">
        <label>Descrizione</label>
        <input type="text" id="exf-desc" class="editor-input" value="${ex ? ex.desc : ''}" placeholder="istruzioni brevi">
      </div>
      <div class="ex-form-field">
        <label>Tipo</label>
        <select id="exf-type" class="editor-input">
          <option value="sets" ${!ex || ex.type === 'sets' ? 'selected' : ''}>sets — serie ripetute</option>
          <option value="single" ${ex && ex.type === 'single' ? 'selected' : ''}>single — campo unico</option>
        </select>
      </div>
      <div class="ex-form-field">
        <label>Campi da registrare</label>
        <div class="ex-form-checks">
          ${allFields.map(f => `
            <label class="ex-form-check">
              <input type="checkbox" value="${f}" ${ex && ex.fields.includes(f) ? 'checked' : ''}> ${f}
            </label>`).join('')}
        </div>
      </div>
      <div class="ex-form-field">
        <label>Target</label>
        <input type="text" id="exf-target" class="editor-input" value="${ex ? ex.target : ''}" placeholder="es. 4×3, rec 3 min">
      </div>
      <div class="ex-form-field">
        <label class="ex-form-check" style="text-transform:none;letter-spacing:0;font-size:12px">
          <input type="checkbox" id="exf-mobility" ${ex && ex.mobility ? 'checked' : ''}> Esercizio di mobilità
        </label>
      </div>
    </div>
    <div class="ex-form-actions">
      <button class="btn-primary" style="flex:0;padding:8px 18px;font-size:13px" onclick="saveExercise('${ex ? ex.id : ''}')">
        ${ex ? 'Aggiorna' : 'Aggiungi'}
      </button>
      <button class="btn-secondary" style="padding:8px 14px;font-size:13px" onclick="hideExForm()">Annulla</button>
    </div>`
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function editExercise(exId) {
  showExForm(editingSessions[editorCurrentSession].exercises.find(e => e.id === exId))
}

function addExercise() {
  showExForm(null)
}

function deleteExercise(exId) {
  if (!confirm('Eliminare questo esercizio?')) return
  editingSessions[editorCurrentSession].exercises =
    editingSessions[editorCurrentSession].exercises.filter(e => e.id !== exId)
  renderEditorSession(editorCurrentSession)
}

function saveExercise(existingId) {
  const name = document.getElementById('exf-name').value.trim()
  if (!name) { alert("Inserisci il nome dell'esercizio"); return }
  const fields = Array.from(document.querySelectorAll('#editor-ex-form .ex-form-checks input:checked')).map(c => c.value)
  if (!fields.length) { alert('Seleziona almeno un campo da registrare'); return }
  const exData = {
    id: existingId || ('ex_' + Date.now()),
    name,
    desc:     document.getElementById('exf-desc').value.trim(),
    type:     document.getElementById('exf-type').value,
    fields,
    target:   document.getElementById('exf-target').value.trim(),
  }
  if (document.getElementById('exf-mobility').checked) exData.mobility = true
  const exercises = editingSessions[editorCurrentSession].exercises
  if (existingId) {
    const idx = exercises.findIndex(e => e.id === existingId)
    if (idx !== -1) exercises[idx] = exData
  } else {
    exercises.push(exData)
  }
  renderEditorSession(editorCurrentSession)
}

async function saveSessionsToSupabase() {
  const nameInput = document.getElementById('editor-session-name')
  if (nameInput) editingSessions[editorCurrentSession].name = nameInput.value
  const btn = document.querySelector('#editor-overlay .btn-primary')
  btn.disabled = true
  btn.textContent = 'Salvataggio...'
  try {
    SESSIONS = editingSessions
    await saveSessionsConfig()
    closeEditor()
    renderForm()
    toast('Sessioni salvate')
  } catch (e) {
    toast('Errore salvataggio: ' + e.message, true)
    btn.disabled = false
    btn.textContent = 'Salva sessioni'
  }
}

// ========== EXPOSE GLOBALS (called from inline onclick attrs) ==========
window.handleSignIn        = handleSignIn
window.switchSession       = switchSession
window.switchView          = switchView
window.addSet              = addSet
window.removeSet           = removeSet
window.saveLog             = saveLog
window.renderForm          = renderForm
window.deleteLog           = deleteLog
window.updatePullupDisplay = updatePullupDisplay
window.addPullups          = addPullups
window.openEditor          = openEditor
window.closeEditor         = closeEditor
window.closeEditorIfOverlay = closeEditorIfOverlay
window.switchEditorSession = switchEditorSession
window.addExercise         = addExercise
window.editExercise        = editExercise
window.deleteExercise      = deleteExercise
window.saveExercise        = saveExercise
window.saveSessionsToSupabase = saveSessionsToSupabase
window.hideExForm          = hideExForm
