import { useState } from 'react'
import { getArchiv, deleteBogen } from '../store.js'
import { exportBogen, shareBogen } from '../utils/exportXlsx.js'

function fmtDatum(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export default function ArchivScreen({ go }) {
  const [boegen, setBoegen] = useState(() => getArchiv())

  const handleDelete = (id) => {
    if (!confirm('Diesen Bogen wirklich löschen?')) return
    deleteBogen(id)
    setBoegen(getArchiv())
  }

  const handleExport = async (b) => {
    try {
      await exportBogen(b)
    } catch (err) {
      alert('Export fehlgeschlagen: ' + err.message)
    }
  }

  const handleShare = async (b) => {
    try {
      await shareBogen(b)
    } catch (err) {
      alert('Teilen fehlgeschlagen: ' + err.message)
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="back-btn" onClick={() => go('home')}>
          ‹ Zurück
        </button>
        <h1>Archiv</h1>
      </div>

      {boegen.length === 0 ? (
        <div className="empty">
          <p>Noch keine gespeicherten Bögen.</p>
          <button className="btn" onClick={() => go('erfassung')}>
            ＋ Neuen Bogen erstellen
          </button>
        </div>
      ) : (
        boegen.map((b) => (
          <div className="list-item" key={b.id}>
            <div className="grow">
              <div className="title">Filiale {b.filialeNummer || '?'}</div>
              <div className="sub">
                {fmtDatum(b.datum)} · Inventur-Nr. {b.inventurNr}
                {b.ergebnis !== '' && ` · ${b.ergebnis}%`}
              </div>
            </div>
            <button className="btn small secondary" onClick={() => go('erfassung', { bogenId: b.id })}>
              Öffnen
            </button>
            <button className="btn small" onClick={() => handleShare(b)}>
              📤
            </button>
            <button className="btn small secondary" onClick={() => handleExport(b)}>
              ⬇
            </button>
            <button className="btn small danger" onClick={() => handleDelete(b.id)}>
              ✕
            </button>
          </div>
        ))
      )}
    </>
  )
}
