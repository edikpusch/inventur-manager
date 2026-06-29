import { getProfil, getArchiv } from '../store.js'

export default function HomeScreen({ go }) {
  const profil = getProfil()
  const archivCount = getArchiv().length
  const profilOk = profil.vlName && profil.filialen.length > 0

  return (
    <>
      <div className="topbar">
        <h1>InventurManager</h1>
      </div>

      {!profilOk && (
        <div className="card" style={{ borderColor: 'var(--blue)' }}>
          <h2>Erst einrichten</h2>
          <p className="muted">
            Lege zuerst deinen VL-Namen und mindestens eine Filiale an, dann kannst du Bögen
            erstellen.
          </p>
          <button className="btn" onClick={() => go('einstellungen')}>
            Profil einrichten
          </button>
        </div>
      )}

      <div className="card">
        <button className="btn green" disabled={!profilOk} onClick={() => go('erfassung')}>
          ＋ Neuen Bogen erstellen
        </button>
        <button className="btn secondary" onClick={() => go('archiv')}>
          🗂 Archiv {archivCount > 0 ? `(${archivCount})` : ''}
        </button>
        <button className="btn secondary" onClick={() => go('einstellungen')}>
          ⚙ Einstellungen
        </button>
      </div>

      {profilOk && (
        <p className="muted" style={{ textAlign: 'center' }}>
          VL: {profil.vlName} · {profil.filialen.length} Filiale(n)
        </p>
      )}
    </>
  )
}
