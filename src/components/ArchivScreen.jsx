import { useState, useRef, useEffect } from 'react'
import { getArchiv, deleteBogen } from '../store.js'
import { exportBogen, buildDatei, teileDateiJetzt } from '../utils/exportXlsx.js'

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

  // Dateien im Hintergrund vorbereiten. Beim Teilen muss die Datei FERTIG sein:
  // navigator.share() verlangt eine frische Nutzer-Geste, ein `await` davor
  // führt zu „NotAllowedError: Permission denied".
  const dateien = useRef({})
  const laeuft = useRef({})

  const vorbereiten = (b) => {
    if (dateien.current[b.id] || laeuft.current[b.id]) return
    laeuft.current[b.id] = true
    buildDatei(b)
      .then((f) => {
        dateien.current[b.id] = f
      })
      .catch(() => {})
      .finally(() => {
        laeuft.current[b.id] = false
      })
  }

  // Beim Öffnen des Archivs alle Dateien nacheinander vorbereiten
  useEffect(() => {
    let abbruch = false
    ;(async () => {
      for (const b of boegen) {
        if (abbruch) return
        if (dateien.current[b.id]) continue
        try {
          dateien.current[b.id] = await buildDatei(b)
        } catch {
          /* einzelne Datei überspringen */
        }
      }
    })()
    return () => {
      abbruch = true
    }
  }, [boegen])

  // NICHT async – siehe Kommentar oben.
  const handleShare = (b) => {
    const datei = dateien.current[b.id]
    if (!datei) {
      vorbereiten(b)
      alert('Die Datei wird gerade vorbereitet – bitte gleich noch einmal auf Teilen tippen.')
      return
    }
    teileDateiJetzt(datei, {
      onFallback: (grund) => {
        alert(
          'Direktes Teilen hat nicht geklappt – die Datei wurde heruntergeladen.\n\n' +
            `Grund: ${grund}`
        )
      },
    })
  }

  return (
    <>
      <div className="topbar">
        <button className="back-btn" onClick={() => go('home')}>
          ‹ Zurück
        </button>
        <h1>Archiv</h1>
        <button className="home-btn" onClick={() => go('home')} title="Zum Startbildschirm">
          🏠
        </button>
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
            <button
              className="btn small"
              onPointerDown={() => vorbereiten(b)}
              onClick={() => handleShare(b)}
              title="Teilen"
            >
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
