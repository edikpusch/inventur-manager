import { useState } from 'react'
import { getProfil, getArchiv, getEntwurf, clearEntwurf } from '../store.js'

function fmtDatum(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function phaseLabel(view) {
  if (!view) return 'Kopfdaten'
  if (view.v === 'kopf') return 'Kopfdaten'
  if (view.v === 'wg' || view.v === 'wgHub') return 'Warengruppen'
  if (view.v === 'art' || view.v === 'artHub') return 'Artikel'
  return 'Abschluss'
}

export default function HomeScreen({ go }) {
  const profil = getProfil()
  const archivCount = getArchiv().length
  const profilOk = profil.vlName && profil.filialen.length > 0
  const [entwurf, setEntwurf] = useState(() => getEntwurf())

  const neuerBogen = () => {
    if (
      entwurf &&
      !confirm('Es gibt einen ungespeicherten Entwurf. Neuen Bogen starten und den Entwurf überschreiben?')
    ) {
      return
    }
    go('erfassung')
  }

  const entwurfVerwerfen = () => {
    if (!confirm('Entwurf wirklich verwerfen?')) return
    clearEntwurf()
    setEntwurf(null)
  }

  return (
    <>
      <div className="topbar">
        <h1>InventurManager</h1>
      </div>

      {entwurf && entwurf.bogen && (
        <div className="card" style={{ borderColor: 'var(--green)' }}>
          <h2>Entwurf fortsetzen</h2>
          <p className="muted">
            Filiale {entwurf.bogen.filialeNummer || '?'} · {fmtDatum(entwurf.bogen.datum)} ·{' '}
            {phaseLabel(entwurf.view)}
          </p>
          <div className="nav-buttons">
            <button className="btn green" onClick={() => go('erfassung', { resumeEntwurf: true })}>
              Fortsetzen
            </button>
            <button className="btn danger" onClick={entwurfVerwerfen}>
              Verwerfen
            </button>
          </div>
        </div>
      )}

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
        <button className="btn green" disabled={!profilOk} onClick={neuerBogen}>
          ＋ Neuen Bogen erstellen
        </button>
        <button className="btn secondary" onClick={() => go('archiv')}>
          🗂 Archiv {archivCount > 0 ? `(${archivCount})` : ''}
        </button>
        <button className="btn secondary" onClick={() => go('auswertung')}>
          📊 Auswertung
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
