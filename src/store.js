// localStorage-Zugriff für InventurManager.
// Keys:
//   im_profil  -> { vlName, filialen: [{ id, nummer, mlName, zielvorgabe }] }
//   im_archiv  -> Array gespeicherter Bögen

const PROFIL_KEY = 'im_profil'
const ARCHIV_KEY = 'im_archiv'

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
