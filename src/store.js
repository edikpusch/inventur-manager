// localStorage-Zugriff für InventurManager.
// Keys:
//   im_profil    -> { vlName, filialen: [{ id, nummer, mlName, zielvorgabe }] }
//   im_archiv    -> Array gespeicherter Bögen
//   im_vorlagen  -> Array eigener Ursache/Maßnahme-Vorlagen [{ id, ursache, massnahme }]
//   im_entwurf   -> { bogen, step }  (Auto-Save des laufenden Bogens)

const PROFIL_KEY = 'im_profil'
const ARCHIV_KEY = 'im_archiv'
const VORLAGEN_KEY = 'im_vorlagen'
const ENTWURF_KEY = 'im_entwurf'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// --- Profil ---
export function getProfil() {
  return read(PROFIL_KEY, { vlName: '', filialen: [] })
}

export function saveProfil(profil) {
  write(PROFIL_KEY, profil)
  return profil
}

export function getFiliale(id) {
  return getProfil().filialen.find((f) => f.id === id) || null
}

// --- Archiv ---
export function getArchiv() {
  return read(ARCHIV_KEY, [])
}

export function getBogen(id) {
  return getArchiv().find((b) => b.id === id) || null
}

export function saveBogen(bogen) {
  const all = getArchiv()
  const idx = all.findIndex((b) => b.id === bogen.id)
  if (idx >= 0) all[idx] = bogen
  else all.unshift(bogen)
  write(ARCHIV_KEY, all)
  return bogen
}

export function deleteBogen(id) {
  write(ARCHIV_KEY, getArchiv().filter((b) => b.id !== id))
}

// Schlägt die nächste Inventur-Nr. für eine Filiale vor: Anzahl der Archiv-Bögen
// dieser Filiale im aktuellen Kalenderjahr + 1 (als String).
export function naechsteInventurNr(filialeId) {
  const jahr = new Date().getFullYear()
  const count = getArchiv().filter((b) => {
    if (b.filialeId !== filialeId) return false
    const d = new Date(b.datum)
    return !isNaN(d) && d.getFullYear() === jahr
  }).length
  return String(count + 1)
}

// --- Entwurf (Auto-Save des laufenden Bogens) ---
export function getEntwurf() {
  return read(ENTWURF_KEY, null)
}

// view = aktuelle Cursor-Position im Wizard (Sektion/Schritt), damit "Fortsetzen"
// an derselben Stelle weitermacht.
export function saveEntwurf(bogen, view) {
  write(ENTWURF_KEY, { bogen, view })
}

export function clearEntwurf() {
  localStorage.removeItem(ENTWURF_KEY)
}

// --- Eigene Ursache/Maßnahme-Vorlagen ---
export function getVorlagen() {
  return read(VORLAGEN_KEY, [])
}

// Speichert eine Vorlage. Existiert bereits eine mit gleicher Ursache,
// wird deren Maßnahme aktualisiert (kein Duplikat).
export function saveVorlage({ ursache, massnahme }) {
  const u = (ursache || '').trim()
  const m = (massnahme || '').trim()
  if (!u) return getVorlagen()
  const all = getVorlagen()
  const idx = all.findIndex((v) => v.ursache.trim().toLowerCase() === u.toLowerCase())
  if (idx >= 0) all[idx] = { ...all[idx], ursache: u, massnahme: m }
  else all.push({ id: uid(), ursache: u, massnahme: m })
  write(VORLAGEN_KEY, all)
  return all
}

export function deleteVorlage(id) {
  const all = getVorlagen().filter((v) => v.id !== id)
  write(VORLAGEN_KEY, all)
  return all
}

// --- Favoriten für "Datum Nachkontrolle" (z.B. "regelmäßig") ---
const NK_KEY = 'im_nk_favoriten'

export function getNkFavoriten() {
  return read(NK_KEY, [])
}

export function saveNkFavorit(text) {
  const t = (text || '').trim()
  if (!t) return getNkFavoriten()
  const all = getNkFavoriten()
  if (!all.some((x) => x.toLowerCase() === t.toLowerCase())) all.push(t)
  write(NK_KEY, all)
  return all
}

export function deleteNkFavorit(text) {
  const all = getNkFavoriten().filter((x) => x !== text)
  write(NK_KEY, all)
  return all
}
