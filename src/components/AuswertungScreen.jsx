import { useState } from 'react'
import { getArchiv, getProfil } from '../store.js'

// Zahl aus gespeicherten Werten lesen (deutsches Komma erlaubt)
const num = (v) => {
  const s = String(v ?? '').trim().replace(',', '.')
  if (s === '' || s === '-' || s === '+') return null
  const n = Number(s)
  return isFinite(n) ? n : null
}
const fmtEur = (n) =>
  n === null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const fmtPct = (n) =>
  n === null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`

// Warengruppen bzw. Artikel über alle Bögen zusammenfassen (Name = Schlüssel).
function aggregiere(boegen, listenKey, nameFeld) {
  const map = new Map()
  boegen.forEach((b) => {
    ;(b[listenKey] || []).forEach((e) => {
      const name = (e[nameFeld] || '').trim()
      if (!name) return
      const k = name.toLowerCase()
      let rec = map.get(k)
      if (!rec) {
        rec = { name, summe: 0, pctSumme: 0, pctAnzahl: 0, anzahl: 0, warengruppe: '' }
        map.set(k, rec)
      }
      rec.anzahl++
      const eur = num(e.verlustEuro)
      if (eur !== null) rec.summe += eur
      const pct = num(e.verlustProzent)
      if (pct !== null) {
        rec.pctSumme += pct
        rec.pctAnzahl++
      }
      // Artikel: zugehörige Warengruppe aus demselben Bogen merken
      if (listenKey === 'artikel' && !rec.warengruppe) {
        const w = (b.warengruppen || []).find((x) => x.id === e.warengruppeId)
        if (w && (w.warengruppe || '').trim()) rec.warengruppe = w.warengruppe.trim()
      }
    })
  })
  return [...map.values()].map((r) => ({
    ...r,
    avgPct: r.pctAnzahl > 0 ? r.pctSumme / r.pctAnzahl : null,
  }))
}

// Sortierung nach gewählter Kennzahl: größter Verlust zuerst
function sortiere(liste, kennzahl) {
  const arr = [...liste]
  if (kennzahl === 'anzahl') return arr.sort((a, b) => b.anzahl - a.anzahl || a.summe - b.summe)
  if (kennzahl === 'pct')
    return arr.sort((a, b) => (a.avgPct ?? Infinity) - (b.avgPct ?? Infinity))
  return arr.sort((a, b) => a.summe - b.summe)
}

// Kennzahlen je Filiale (Ø Differenz Ergebnis − Vorgabe, letztes Ergebnis)
function filialStatistik(boegen) {
  const map = new Map()
  boegen.forEach((b) => {
    const key = b.filialeId || b.filialeNummer
    if (!key) return
    let rec = map.get(key)
    if (!rec) {
      rec = { key, nummer: b.filialeNummer || '?', diffs: [], letzte: null, letztesDatum: '', anzahl: 0 }
      map.set(key, rec)
    }
    rec.anzahl++
    const erg = num(b.ergebnis)
    const vor = num(b.vorgabe)
    if (erg !== null && vor !== null) rec.diffs.push(erg - vor)
    const d = String(b.datum || '')
    if (erg !== null && d >= rec.letztesDatum) {
      rec.letztesDatum = d
      rec.letzte = erg
    }
  })
  return [...map.values()]
    .map((r) => ({
      ...r,
      avgDiff: r.diffs.length ? r.diffs.reduce((a, c) => a + c, 0) / r.diffs.length : null,
    }))
    .sort((a, b) => (a.avgDiff ?? Infinity) - (b.avgDiff ?? Infinity))
}

export default function AuswertungScreen({ go }) {
  const profil = getProfil()
  const archiv = getArchiv()
  const [bereich, setBereich] = useState('bezirk') // 'bezirk' | filialeId
  const [kennzahl, setKennzahl] = useState('euro') // 'euro' | 'pct' | 'anzahl'

  const gefiltert =
    bereich === 'bezirk'
      ? archiv
      : archiv.filter((b) => (b.filialeId || b.filialeNummer) === bereich)

  const wgListe = sortiere(aggregiere(gefiltert, 'warengruppen', 'warengruppe'), kennzahl)
  const artListe = sortiere(aggregiere(gefiltert, 'artikel', 'artikelName'), kennzahl)
  const filialen = filialStatistik(archiv)

  const wert = (r) =>
    kennzahl === 'anzahl' ? `${r.anzahl}×` : kennzahl === 'pct' ? fmtPct(r.avgPct) : fmtEur(r.summe)
  const negativ = (r) =>
    kennzahl === 'anzahl' ? false : kennzahl === 'pct' ? (r.avgPct ?? 0) < 0 : r.summe < 0

  const rangListe = (liste, leerText) => {
    if (liste.length === 0) return <p className="muted">{leerText}</p>
    return liste.slice(0, 20).map((r, i) => (
      <div className="list-item" key={r.name}>
        <div className="rang">{i + 1}</div>
        <div className="grow">
          <div className="title">{r.name}</div>
          <div className="sub">
            {r.warengruppe ? `${r.warengruppe} · ` : ''}
            {fmtEur(r.summe)} · Ø {fmtPct(r.avgPct)} · {r.anzahl}× erfasst
          </div>
        </div>
        <div className={`kennzahl ${negativ(r) ? 'neg' : ''}`}>{wert(r)}</div>
      </div>
    ))
  }

  return (
    <>
      <div className="topbar">
        <button className="back-btn" onClick={() => go('home')}>
          ‹ Zurück
        </button>
        <h1>Auswertung</h1>
        <button className="home-btn" onClick={() => go('home')} title="Zum Startbildschirm">
          🏠
        </button>
      </div>

      {archiv.length === 0 ? (
        <div className="empty">
          <p>Noch keine Inventuren im Archiv.</p>
          <p className="muted">Sobald du Bögen abgeschlossen hast, erscheint hier die Auswertung.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>Bereich</h3>
            <div className="checks" style={{ marginBottom: 14 }}>
              <button className={bereich === 'bezirk' ? 'active' : ''} onClick={() => setBereich('bezirk')}>
                Bezirk (alle)
              </button>
              {profil.filialen.map((f) => (
                <button key={f.id} className={bereich === f.id ? 'active' : ''} onClick={() => setBereich(f.id)}>
                  {f.nummer}
                </button>
              ))}
            </div>
            <h3>Kennzahl</h3>
            <div className="checks">
              <button className={kennzahl === 'euro' ? 'active' : ''} onClick={() => setKennzahl('euro')}>
                Summe €
              </button>
              <button className={kennzahl === 'pct' ? 'active' : ''} onClick={() => setKennzahl('pct')}>
                Ø %
              </button>
              <button className={kennzahl === 'anzahl' ? 'active' : ''} onClick={() => setKennzahl('anzahl')}>
                Anzahl
              </button>
            </div>
            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
              {gefiltert.length} Inventur(en) ausgewertet
            </p>
          </div>

          {bereich === 'bezirk' && (
            <div className="card">
              <h2>Filial-Rangliste</h2>
              <h3>Ø Abweichung von der Zielvorgabe – schlechteste zuerst</h3>
              {filialen.length === 0 ? (
                <p className="muted">Keine Filialdaten vorhanden.</p>
              ) : (
                filialen.map((f, i) => (
                  <div className="list-item" key={f.key}>
                    <div className="rang">{i + 1}</div>
                    <div className="grow">
                      <div className="title">Filiale {f.nummer}</div>
                      <div className="sub">
                        zuletzt {fmtPct(f.letzte)} · {f.anzahl} Inventur(en)
                      </div>
                    </div>
                    <div className={`kennzahl ${(f.avgDiff ?? 0) < 0 ? 'neg' : ''}`}>{fmtPct(f.avgDiff)}</div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="card">
            <h2>Flop-Warengruppen</h2>
            <h3>Größte Verluste{bereich !== 'bezirk' ? ' in dieser Filiale' : ' im Bezirk'}</h3>
            {rangListe(wgListe, 'Noch keine Warengruppen erfasst.')}
          </div>

          <div className="card">
            <h2>Flop-Artikel</h2>
            <h3>Größte Verluste{bereich !== 'bezirk' ? ' in dieser Filiale' : ' im Bezirk'}</h3>
            {rangListe(artListe, 'Noch keine Artikel erfasst.')}
          </div>
        </>
      )}
    </>
  )
}
