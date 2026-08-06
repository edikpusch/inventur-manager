import { useState, useEffect, useRef } from 'react'
import {
  getProfil,
  getFiliale,
  getBogen,
  saveBogen,
  uid,
  getVorlagen,
  saveVorlage,
  getNkFavoriten,
  saveNkFavorit,
  naechsteInventurNr,
  getEntwurf,
  saveEntwurf,
  clearEntwurf,
  deleteVorlage,
  getArtikelStamm,
  saveArtikelStamm,
  getGeloeschteUrsachen,
  loescheUrsache,
} from '../store.js'
import { exportBogen, shareBogen, buildDatei, recomputeArtikelProzente } from '../utils/exportXlsx.js'
import { URSACHEN_LISTE } from '../data/ursachenListe.js'
import { WARENGRUPPEN } from '../data/warengruppenListe.js'
import SignedInput from './SignedInput.jsx'

const NK_PRESETS = ['regelmäßig', 'wöchentlich', '14-tägig', 'monatlich']

function heute() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// Neuer Eintrag – übernimmt Umsetzung/Kontrolle/Nachkontrolle vom vorherigen
// Eintrag derselben Liste (weiterhin pro Eintrag änderbar).
function neuerEintrag(firstKey, prev) {
  const e = {
    id: uid(),
    [firstKey]: '',
    wgFrei: false,
    warengruppeId: '',
    verlustEuro: '',
    verlustProzent: '',
    ursachen: [],
    massnahme: '',
    umsetzungChecks: { ML: false, MLV: false, VL: false },
    umsetzungFrei: '',
    kontrolleChecks: { ML: false, MLV: false, VL: false },
    kontrolleFrei: '',
    datumNachkontrolle: '',
    io: '',
  }
  if (prev) {
    e.umsetzungChecks = { ...prev.umsetzungChecks }
    e.umsetzungFrei = prev.umsetzungFrei || ''
    e.kontrolleChecks = { ...prev.kontrolleChecks }
    e.kontrolleFrei = prev.kontrolleFrei || ''
    e.datumNachkontrolle = prev.datumNachkontrolle || ''
  }
  return e
}

function neuerBogen(profil) {
  const erste = profil.filialen[0] || { id: '', nummer: '' }
  return {
    id: uid(),
    filialeId: erste.id,
    filialeNummer: erste.nummer,
    datum: heute(),
    inventurNr: erste.id ? naechsteInventurNr(erste.id) : '1',
    ergebnis: '',
    vorgabe: erste.zielvorgabe || '',
    eas: true,
    kamera: 'groß',
    personaldelikte: '0',
    kuehlschaeden: '0',
    warengruppen: [],
    artikel: [],
    nameMl: erste.mlName || '',
    nameVl: profil.vlName || '',
    createdAt: new Date().toISOString(),
  }
}

const parseNum = (v) => {
  const s = String(v ?? '').trim().replace(',', '.')
  if (s === '' || s === '-' || s === '+') return null
  const n = Number(s)
  return isFinite(n) ? n : null
}
// Artikel-%: Anteil am Betrag der Warengruppe, Vorzeichen folgt dem Artikel-€
const berechnePct = (euroVal, wgEuro) => {
  const a = parseNum(euroVal)
  if (a === null || wgEuro === null || wgEuro === 0) return ''
  return String(Math.round((a / Math.abs(wgEuro)) * 10000) / 100)
}

const isEmptyWg = (e) =>
  !((e.warengruppe || '').trim()) &&
  !String(e.verlustEuro || '').trim() &&
  !String(e.verlustProzent || '').trim() &&
  (!e.ursachen || e.ursachen.length === 0)
const isEmptyArt = (e) =>
  !((e.artikelName || '').trim()) &&
  !String(e.verlustEuro || '').trim() &&
  (!e.ursachen || e.ursachen.length === 0)

// Hat der Bogen überhaupt Inhalt? Sonst wird kein Entwurf angelegt (sonst
// erschiene nach jedem Antippen eine leere „Entwurf fortsetzen"-Karte).
const hatInhalt = (b) =>
  String(b.ergebnis ?? '').trim() !== '' ||
  (b.warengruppen || []).some((e) => !isEmptyWg(e)) ||
  (b.artikel || []).some((e) => !isEmptyArt(e))

function sectionIndex(v) {
  if (v === 'kopf') return 0
  if (v === 'wg' || v === 'wgHub') return 1
  if (v === 'art' || v === 'artHub') return 2
  return 3
}

const tap = () => {
  try {
    navigator.vibrate && navigator.vibrate(10)
  } catch {
    /* iOS kann kein vibrate */
  }
}

export default function ErfassungFlow({ go, bogenId, resumeEntwurf }) {
  const profil = getProfil()

  const [bogen, setBogen] = useState(() => {
    if (resumeEntwurf) {
      const e = getEntwurf()
      if (e && e.bogen) return e.bogen
    }
    if (bogenId) {
      const v = getBogen(bogenId)
      if (v) return v
    }
    return neuerBogen(profil)
  })
  const [view, setView] = useState(() => {
    if (resumeEntwurf) {
      const e = getEntwurf()
      if (e && e.view) return e.view
    }
    if (bogenId) return { v: 'abschluss' }
    return { v: 'kopf', step: 0 }
  })

  const [vorlagen, setVorlagen] = useState(() => getVorlagen())
  const [nkFavoriten, setNkFavoriten] = useState(() => getNkFavoriten())
  const [artikelStamm, setArtikelStamm] = useState(() => getArtikelStamm())
  const [geloescht, setGeloescht] = useState(() => getGeloeschteUrsachen())
  const addNkFavorit = (t) => setNkFavoriten(saveNkFavorit(t))

  // Eigene Ursache immer zusammen mit eigener Maßnahme
  const [freiOffen, setFreiOffen] = useState(false)
  const [freiUrsache, setFreiUrsache] = useState('')
  const [freiMassnahme, setFreiMassnahme] = useState('')
  // Ursachen-Auswahl: Suche + eingeklappte Kategorien
  const [ursSuche, setUrsSuche] = useState('')
  const [offeneKats, setOffeneKats] = useState([])

  // Neuer Bogen: alten Entwurf verwerfen (Überschreiben bestätigt in HomeScreen)
  useEffect(() => {
    if (!resumeEntwurf && !bogenId) clearEntwurf()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-Save (debounced) – speichert Bogen UND Cursor-Position
  const firstRun = useRef(true)
  const saveTimer = useRef(null)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (hatInhalt(bogen)) saveEntwurf(bogen, view)
      else clearEntwurf()
    }, 500)
    return () => clearTimeout(saveTimer.current)
  }, [bogen, view])

  // Home: Erfassung pausieren – Entwurf sofort sichern (nicht auf den
  // laufenden Auto-Save warten) und zurück zum Startbildschirm.
  const goHome = () => {
    clearTimeout(saveTimer.current)
    if (hatInhalt(bogen)) saveEntwurf(bogen, view)
    else clearEntwurf()
    tap()
    go('home')
  }

  // Screen-Wechsel: nach oben scrollen; Ursachen-Suche zurücksetzen
  useEffect(() => {
    window.scrollTo(0, 0)
    setUrsSuche('')
    setFreiOffen(false)
  }, [view])

  // ── Bogen-/Eintrag-Änderungen ──────────────────────────────────────────────
  const setB = (patch) => setBogen((b) => ({ ...b, ...patch }))
  const patchWg = (patch) =>
    setBogen((b) => ({
      ...b,
      warengruppen: b.warengruppen.map((e, idx) => (idx === view.i ? { ...e, ...patch } : e)),
    }))
  const patchArt = (patch) =>
    setBogen((b) => ({
      ...b,
      artikel: b.artikel.map((e, idx) => (idx === view.i ? { ...e, ...patch } : e)),
    }))

  const handleFiliale = (id) => {
    const f = getFiliale(id)
    setB({
      filialeId: id,
      filialeNummer: f ? f.nummer : '',
      nameMl: f ? f.mlName || '' : '',
      vorgabe: f ? f.zielvorgabe || '' : '',
      inventurNr: naechsteInventurNr(id),
    })
  }

  // ── Ursachen (Mehrfach) + automatische Maßnahme ────────────────────────────
  const massnahmeFor = (urs) => {
    const f =
      vorlagen.find((v) => v.ursache === urs) || URSACHEN_LISTE.find((u) => u.ursache === urs)
    return f ? f.massnahme : ''
  }
  // Auswahlliste ohne die per ✕ gelöschten eingebauten Ursachen
  const aktiveBuiltins = URSACHEN_LISTE.filter((u) => !geloescht.includes(u.ursache))
  const aktiveGruppen = aktiveBuiltins.reduce((acc, u) => {
    ;(acc[u.kategorie] = acc[u.kategorie] || []).push(u)
    return acc
  }, {})
  // Ursache dauerhaft aus der Auswahl entfernen (wiederherstellbar in Einstellungen)
  const ursacheLoeschen = (name, vorlageId) => {
    tap()
    if (vorlageId) setVorlagen(deleteVorlage(vorlageId))
    else setGeloescht(loescheUrsache(name))
  }
  const addUrsache = (entry, patch, text) => {
    const t = (text || '').trim()
    if (!t || entry.ursachen.includes(t)) return
    const m = massnahmeFor(t)
    let mass = entry.massnahme || ''
    if (m && !mass.split('\n').some((l) => l.trim() === m.trim())) mass = mass ? `${mass}\n${m}` : m
    patch({ ursachen: [...entry.ursachen, t], massnahme: mass })
  }
  const removeUrsache = (entry, patch, text) => {
    const m = massnahmeFor(text)
    let mass = entry.massnahme || ''
    if (m) mass = mass.split('\n').filter((l) => l.trim() !== m.trim()).join('\n')
    patch({ ursachen: entry.ursachen.filter((u) => u !== text), massnahme: mass })
  }
  const toggleUrsache = (entry, patch, u) =>
    entry.ursachen.includes(u) ? removeUrsache(entry, patch, u) : addUrsache(entry, patch, u)
  const toggleCheck = (entry, patch, groupKey, k) =>
    patch({ [groupKey]: { ...entry[groupKey], [k]: !entry[groupKey][k] } })

  // ── Navigation ──────────────────────────────────────────────────────────────
  const kopfNext = () =>
    setView((vw) => (vw.step < 6 ? { v: 'kopf', step: vw.step + 1 } : { v: 'wgHub' }))
  const wgNext = () =>
    setView((vw) => (vw.step < 4 ? { v: 'wg', i: vw.i, step: vw.step + 1 } : { v: 'wgHub' }))
  const artNext = () =>
    setView((vw) => (vw.step < 5 ? { v: 'art', i: vw.i, step: vw.step + 1 } : { v: 'artHub' }))

  const addWg = () => {
    tap()
    const prev = bogen.warengruppen[bogen.warengruppen.length - 1]
    setBogen((b) => ({ ...b, warengruppen: [...b.warengruppen, neuerEintrag('warengruppe', prev)] }))
    setView({ v: 'wg', i: bogen.warengruppen.length, step: 0 })
  }
  const addArt = () => {
    tap()
    const prev = bogen.artikel[bogen.artikel.length - 1]
    setBogen((b) => ({ ...b, artikel: [...b.artikel, neuerEintrag('artikelName', prev)] }))
    setView({ v: 'art', i: bogen.artikel.length, step: 0 })
  }
  const delWg = (i) => {
    if (!confirm('Warengruppe löschen?')) return
    setBogen((b) => ({ ...b, warengruppen: b.warengruppen.filter((_, idx) => idx !== i) }))
  }
  const delArt = (i) => {
    if (!confirm('Artikel löschen?')) return
    setBogen((b) => ({ ...b, artikel: b.artikel.filter((_, idx) => idx !== i) }))
  }

  const back = () => {
    if (view.v === 'kopf') {
      if (view.step > 0) setView({ v: 'kopf', step: view.step - 1 })
      else go('home')
    } else if (view.v === 'wgHub') {
      setView({ v: 'kopf', step: 6 })
    } else if (view.v === 'wg') {
      if (view.step > 0) setView({ v: 'wg', i: view.i, step: view.step - 1 })
      else {
        // leeren, gerade neu angelegten Eintrag verwerfen
        if (bogen.warengruppen[view.i] && isEmptyWg(bogen.warengruppen[view.i]))
          setBogen((b) => ({ ...b, warengruppen: b.warengruppen.filter((_, idx) => idx !== view.i) }))
        setView({ v: 'wgHub' })
      }
    } else if (view.v === 'artHub') {
      setView({ v: 'wgHub' })
    } else if (view.v === 'art') {
      if (view.step > 0) setView({ v: 'art', i: view.i, step: view.step - 1 })
      else {
        if (bogen.artikel[view.i] && isEmptyArt(bogen.artikel[view.i]))
          setBogen((b) => ({ ...b, artikel: b.artikel.filter((_, idx) => idx !== view.i) }))
        setView({ v: 'artHub' })
      }
    } else {
      setView({ v: 'artHub' })
    }
  }

  // ── Abschluss ────────────────────────────────────────────────────────────────
  // Bogen in Export-Form (ohne leere Einträge, Prozente frisch) – ohne Speichern.
  const bogenFuerExport = () =>
    recomputeArtikelProzente({
      ...bogen,
      warengruppen: bogen.warengruppen.filter((e) => !isEmptyWg(e)),
      artikel: bogen.artikel.filter((e) => !isEmptyArt(e)),
    })

  // Erfasste Artikel in den Artikelstamm übernehmen (Name + Warengruppe)
  const syncArtikelStamm = () => {
    let stamm = null
    bogen.artikel.forEach((a) => {
      const nm = (a.artikelName || '').trim()
      if (!nm) return
      const wg = bogen.warengruppen.find((w) => w.id === a.warengruppeId)
      stamm = saveArtikelStamm({ name: nm, warengruppe: wg ? wg.warengruppe : '' })
    })
    if (stamm) setArtikelStamm(stamm)
  }

  const finalize = () => {
    clearTimeout(saveTimer.current)
    const fertig = bogenFuerExport()
    saveBogen(fertig)
    syncArtikelStamm()
    clearEntwurf()
    return fertig
  }

  // Datei im Abschluss-Screen vorab bauen, damit navigator.share() direkt aus
  // dem Antippen heraus startet (sonst blockiert Android das Teilen).
  const dateiRef = useRef(null)
  const dateiPromise = useRef(null)
  useEffect(() => {
    if (view.v !== 'abschluss') return
    dateiRef.current = null
    dateiPromise.current = null
    let verworfen = false
    const t = setTimeout(async () => {
      try {
        const f = await buildDatei(bogenFuerExport())
        if (!verworfen) dateiRef.current = f
      } catch {
        dateiRef.current = null
      }
    }, 250)
    return () => {
      verworfen = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.v, bogen])

  // Beim Zurückkehren zur Artikel-Liste bereits erfasste Artikel merken,
  // damit sie schon im selben Bogen über die Suche auffindbar sind.
  useEffect(() => {
    if (view.v === 'artHub') syncArtikelStamm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.v])

  // Falls die Vorab-Erzeugung noch nicht durch ist: beim Berühren nachziehen
  const dateiVorbereiten = () => {
    if (!dateiRef.current && !dateiPromise.current) {
      dateiPromise.current = buildDatei(bogenFuerExport()).catch(() => null)
    }
  }

  const handleShare = async () => {
    const f = finalize()
    const datei = dateiRef.current || (dateiPromise.current ? await dateiPromise.current : null)
    try {
      const ergebnis = await shareBogen(f, datei)
      if (ergebnis === 'abgebrochen') return // Nutzer hat abgebrochen – hier bleiben
      if (ergebnis === 'download') {
        alert(
          'Dieser Browser unterstützt kein direktes Teilen von Dateien – die Datei wurde stattdessen heruntergeladen.'
        )
      }
    } catch (err) {
      alert('Teilen fehlgeschlagen: ' + err.message)
      return
    }
    go('archiv')
  }
  const handleDownload = async () => {
    const f = finalize()
    try {
      await exportBogen(f)
    } catch (err) {
      alert('Export fehlgeschlagen: ' + err.message)
      return
    }
    go('archiv')
  }

  // ── abgeleitete Werte für die Kopf-Anzeige ─────────────────────────────────
  const ergNum = parseNum(bogen.ergebnis)
  const vorNum = parseNum(bogen.vorgabe)
  const beide = ergNum !== null && vorNum !== null
  const schlechter = beide && ergNum < vorNum
  const diff = beide ? Math.round((ergNum - vorNum) * 100) / 100 : null
  const diffText = diff === null ? null : `${diff.toLocaleString('de-DE', { minimumFractionDigits: 2 })} %`

  // ── gemeinsame Eintrags-Screens ────────────────────────────────────────────
  function screenUrsache(entry, patch, next) {
    return (
      <div className="card">
        <div className="wizard-q">Ursache(n) – was läuft konkret falsch?</div>
        {entry.ursachen.length > 0 && (
          <div className="checks" style={{ marginBottom: 12 }}>
            {entry.ursachen.map((u) => (
              <button key={u} type="button" className="active" onClick={() => removeUrsache(entry, patch, u)}>
                {u} ✕
              </button>
            ))}
          </div>
        )}
        {/* Suche über alle Ursachen */}
        <input
          value={ursSuche}
          onChange={(e) => setUrsSuche(e.target.value)}
          placeholder="Ursache suchen…"
          style={{ marginBottom: 12 }}
        />

        {/* Eine wählbare Ursache-Zeile mit ✕ zum dauerhaften Entfernen */}
        {(() => {
          const zeile = (name, vorlageId) => (
            <div className="urs-row" key={vorlageId || name}>
              <button
                type="button"
                className={`urs-name ${entry.ursachen.includes(name) ? 'active' : ''}`}
                onClick={() => { tap(); toggleUrsache(entry, patch, name) }}
              >
                {name}
              </button>
              <button
                type="button"
                className="urs-del"
                title="Aus der Auswahl entfernen"
                onClick={() => ursacheLoeschen(name, vorlageId)}
              >
                ✕
              </button>
            </div>
          )

          const suche = ursSuche.trim().toLowerCase()
          if (suche) {
            const treffer = [
              ...vorlagen.filter((v) => v.ursache.toLowerCase().includes(suche)).map((v) => [v.ursache, v.id]),
              ...aktiveBuiltins.filter((u) => u.ursache.toLowerCase().includes(suche)).map((u) => [u.ursache, null]),
            ]
            return treffer.length === 0 ? (
              <p className="muted">Keine Ursache gefunden.</p>
            ) : (
              treffer.map(([name, vid]) => zeile(name, vid))
            )
          }

          const katOffen = (k) => offeneKats.includes(k)
          const toggleKat = (k) =>
            setOffeneKats((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

          return (
            <>
              {vorlagen.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <button type="button" className="kat-head" onClick={() => toggleKat('★')}>
                    <span>{katOffen('★') ? '▾' : '▸'} ★ Eigene Vorlagen</span>
                    <span className="kat-count">{vorlagen.length}</span>
                  </button>
                  {katOffen('★') && vorlagen.map((v) => zeile(v.ursache, v.id))}
                </div>
              )}
              {Object.entries(aktiveGruppen).map(([kat, list]) => (
                <div key={kat} style={{ marginBottom: 8 }}>
                  <button type="button" className="kat-head" onClick={() => toggleKat(kat)}>
                    <span>{katOffen(kat) ? '▾' : '▸'} {kat}</span>
                    <span className="kat-count">{list.length}</span>
                  </button>
                  {katOffen(kat) && list.map((u) => zeile(u.ursache, null))}
                </div>
              ))}
            </>
          )
        })()}

        {/* Eigene Ursache – immer zusammen mit eigener Maßnahme */}
        {!freiOffen ? (
          <button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setFreiOffen(true)}>
            ✎ Eigene Ursache + Maßnahme
          </button>
        ) : (
          <div className="entry" style={{ marginTop: 12 }}>
            <div className="entry-head">
              <strong>Eigene Ursache</strong>
              <button className="icon-btn" onClick={() => setFreiOffen(false)}>Abbrechen</button>
            </div>
            <label className="field">
              <span>Ursache</span>
              <input value={freiUrsache} onChange={(e) => setFreiUrsache(e.target.value)} />
            </label>
            <label className="field">
              <span>Maßnahme</span>
              <textarea value={freiMassnahme} onChange={(e) => setFreiMassnahme(e.target.value)} />
            </label>
            <button
              className="btn"
              disabled={!freiUrsache.trim() || !freiMassnahme.trim()}
              onClick={() => {
                tap()
                const u = freiUrsache.trim()
                const m = freiMassnahme.trim()
                setVorlagen(saveVorlage({ ursache: u, massnahme: m }))
                // Ursache übernehmen und Maßnahme anhängen
                let mass = entry.massnahme || ''
                if (!mass.split('\n').some((l) => l.trim() === m)) mass = mass ? `${mass}\n${m}` : m
                patch({ ursachen: [...entry.ursachen, u], massnahme: mass })
                setFreiUrsache('')
                setFreiMassnahme('')
                setFreiOffen(false)
              }}
            >
              ＋ Hinzufügen &amp; als Vorlage speichern
            </button>
            <p className="hint" style={{ marginBottom: 0 }}>
              Beides ausfüllen – Ursache und Maßnahme werden zusammen gespeichert.
            </p>
          </div>
        )}

        <label className="field" style={{ marginTop: 14 }}>
          <span>Maßnahme (automatisch vorgeschlagen, editierbar)</span>
          <textarea value={entry.massnahme || ''} onChange={(e) => patch({ massnahme: e.target.value })} />
        </label>
        <button className="btn" onClick={() => { tap(); next() }}>
          Weiter →
        </button>
      </div>
    )
  }

  function checkRow(entry, patch, groupKey, freiKey, labelText) {
    return (
      <>
        <label className="field" style={{ marginBottom: 6 }}>
          <span>{labelText}</span>
        </label>
        <div className="checks">
          {['ML', 'MLV', 'VL'].map((k) => (
            <button
              key={k}
              type="button"
              className={entry[groupKey][k] ? 'active' : ''}
              onClick={() => toggleCheck(entry, patch, groupKey, k)}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          style={{ marginTop: 8 }}
          value={entry[freiKey] || ''}
          onChange={(e) => patch({ [freiKey]: e.target.value })}
          placeholder="Zusatz (optional)"
        />
      </>
    )
  }

  function screenUmsetzung(entry, patch, next) {
    return (
      <div className="card">
        <div className="wizard-q">Umsetzung &amp; Kontrolle durch</div>
        {checkRow(entry, patch, 'umsetzungChecks', 'umsetzungFrei', 'Umsetzung durch')}
        <div style={{ height: 16 }} />
        {checkRow(entry, patch, 'kontrolleChecks', 'kontrolleFrei', 'Kontrolle durch')}
        <button className="btn" style={{ marginTop: 18 }} onClick={() => { tap(); next() }}>
          Weiter →
        </button>
      </div>
    )
  }

  function screenNachkontrolle(entry, patch, next) {
    const nkOptions = [...NK_PRESETS, ...nkFavoriten.filter((f) => !NK_PRESETS.includes(f))]
    const nkText = (entry.datumNachkontrolle || '').trim()
    const istFavorit = nkOptions.some((o) => o.toLowerCase() === nkText.toLowerCase())
    return (
      <div className="card">
        <div className="wizard-q">Datum Nachkontrolle</div>
        <div className="checks" style={{ marginBottom: 12 }}>
          {nkOptions.map((o) => (
            <button
              key={o}
              type="button"
              className={nkText.toLowerCase() === o.toLowerCase() ? 'active' : ''}
              onClick={() => { tap(); patch({ datumNachkontrolle: o }); next() }}
            >
              {o}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Oder eigenes Datum / Text</span>
          <input
            value={entry.datumNachkontrolle || ''}
            onChange={(e) => patch({ datumNachkontrolle: e.target.value })}
          />
        </label>
        {nkText && !istFavorit && (
          <button className="btn ghost small" style={{ marginBottom: 12 }} onClick={() => addNkFavorit(nkText)}>
            ★ „{nkText}" als Favorit speichern
          </button>
        )}
        <button className="btn" onClick={() => { tap(); next() }}>
          Weiter →
        </button>
      </div>
    )
  }

  // ── Render-Bausteine ────────────────────────────────────────────────────────
  function renderKopf() {
    const s = view.step
    if (s === 0)
      return (
        <div className="card">
          <div className="wizard-q">Für welche Filiale?</div>
          {profil.filialen.length === 0 && <p className="muted">Keine Filiale angelegt.</p>}
          {profil.filialen.map((f) => (
            <button
              key={f.id}
              className={`opt ${bogen.filialeId === f.id ? 'selected' : ''}`}
              onClick={() => { tap(); handleFiliale(f.id); kopfNext() }}
            >
              <div>Filiale {f.nummer}</div>
              {f.mlName && <div className="opt-sub">ML: {f.mlName}</div>}
            </button>
          ))}
        </div>
      )
    if (s === 1)
      return (
        <div className="card">
          <div className="wizard-q">Inventurergebnis &amp; Vorgabe</div>
          <div className="row">
            <label className="field">
              <span>Inventurergebnis in %</span>
              <SignedInput value={bogen.ergebnis} onChange={(v) => setB({ ergebnis: v })} defaultNegative autoFocus />
            </label>
            <label className="field">
              <span>Inventurvorgabe in %</span>
              <SignedInput value={bogen.vorgabe} onChange={(v) => setB({ vorgabe: v })} />
            </label>
          </div>
          {beide && (
            <p className="hint">
              {schlechter ? (
                <span className="badge warn">Schlechter als Zielvorgabe · {diffText}</span>
              ) : (
                <span className="badge">Im Rahmen der Zielvorgabe · {diffText}</span>
              )}
            </p>
          )}
          <button className="btn" onClick={() => { tap(); kopfNext() }}>Weiter →</button>
        </div>
      )
    if (s === 2)
      return (
        <div className="card">
          <div className="wizard-q">EAS-Anlage vorhanden?</div>
          <div className="toggle-group">
            <button className={bogen.eas ? 'active green' : ''} onClick={() => { tap(); setB({ eas: true }); kopfNext() }}>ja</button>
            <button className={!bogen.eas ? 'active red' : ''} onClick={() => { tap(); setB({ eas: false }); kopfNext() }}>nein</button>
          </div>
        </div>
      )
    if (s === 3)
      return (
        <div className="card">
          <div className="wizard-q">Kamera-Konzept vorhanden?</div>
          <div className="toggle-group">
            <button className={bogen.kamera === 'groß' ? 'active green' : ''} onClick={() => { tap(); setB({ kamera: 'groß' }); kopfNext() }}>groß</button>
            <button className={bogen.kamera === 'klein' ? 'active green' : ''} onClick={() => { tap(); setB({ kamera: 'klein' }); kopfNext() }}>klein</button>
            <button className={bogen.kamera === 'nein' ? 'active red' : ''} onClick={() => { tap(); setB({ kamera: 'nein' }); kopfNext() }}>nein</button>
          </div>
        </div>
      )
    if (s === 4)
      return (
        <div className="card">
          <div className="wizard-q">Personaldelikte im Zeitraum?</div>
          <div className="checks" style={{ marginBottom: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={bogen.personaldelikte === String(n) ? 'active' : ''}
                onClick={() => { tap(); setB({ personaldelikte: String(n) }); kopfNext() }}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Andere Zahl</span>
            <input value={bogen.personaldelikte} onChange={(e) => setB({ personaldelikte: e.target.value })} inputMode="numeric" autoFocus />
          </label>
          <button className="btn" onClick={() => { tap(); kopfNext() }}>Weiter →</button>
        </div>
      )
    if (s === 5)
      return (
        <div className="card">
          <div className="wizard-q">Kühlschäden TS/TK in €?</div>
          <button className="btn secondary" onClick={() => { tap(); setB({ kuehlschaeden: '0' }); kopfNext() }}>
            0 € – keine
          </button>
          <label className="field">
            <span>Betrag in €</span>
            <input value={bogen.kuehlschaeden} onChange={(e) => setB({ kuehlschaeden: e.target.value })} inputMode="decimal" autoFocus />
          </label>
          <button className="btn" onClick={() => { tap(); kopfNext() }}>Weiter →</button>
        </div>
      )
    // s === 6
    return (
      <div className="card">
        <div className="wizard-q">Datum &amp; Inventur-Nr.</div>
        <label className="field">
          <span>Datum</span>
          <input type="date" value={bogen.datum} onChange={(e) => setB({ datum: e.target.value })} />
        </label>
        <label className="field">
          <span>Inventur-Nr. im laufenden Jahr</span>
          <input value={bogen.inventurNr} onChange={(e) => setB({ inventurNr: e.target.value })} inputMode="numeric" autoFocus />
        </label>
        <button className="btn" onClick={() => { tap(); kopfNext() }}>Weiter zu Warengruppen →</button>
      </div>
    )
  }

  function renderWgHub() {
    return (
      <div className="card">
        <h2>Warengruppen</h2>
        <h3>Analyse der auffälligsten Warengruppen</h3>
        {bogen.warengruppen.length === 0 && <p className="muted">Noch keine Warengruppe erfasst.</p>}
        {bogen.warengruppen.map((w, i) => (
          <div className="list-item" key={w.id}>
            <div className="grow" onClick={() => { tap(); setView({ v: 'wg', i, step: 0 }) }}>
              <div className="title">{w.warengruppe || '(ohne Name)'}</div>
              <div className="sub">
                Verlust {w.verlustEuro || '–'} € · {w.verlustProzent || '–'} %
                {w.ursachen?.length ? ` · ${w.ursachen.length} Ursache(n)` : ''}
              </div>
            </div>
            <button className="btn small secondary" onClick={() => { tap(); setView({ v: 'wg', i, step: 0 }) }}>Bearbeiten</button>
            <button className="btn small danger" onClick={() => delWg(i)}>✕</button>
          </div>
        ))}
        <button className="btn ghost" onClick={addWg}>＋ Warengruppe hinzufügen</button>
        <div className="nav-buttons">
          <button className="btn secondary" onClick={() => setView({ v: 'kopf', step: 6 })}>← Zurück</button>
          <button className="btn" onClick={() => setView({ v: 'artHub' })}>Weiter zu Artikeln →</button>
        </div>
      </div>
    )
  }

  function renderWgEntry() {
    const entry = bogen.warengruppen[view.i]
    if (!entry)
      return (
        <div className="card">
          <button className="btn" onClick={() => setView({ v: 'wgHub' })}>Zur Übersicht</button>
        </div>
      )
    const s = view.step
    if (s === 0)
      return (
        <div className="card">
          <div className="wizard-q">Welche Warengruppe?</div>
          <div className="checks" style={{ marginBottom: 12 }}>
            {WARENGRUPPEN.map((w) => (
              <button
                key={w}
                type="button"
                className={!entry.wgFrei && entry.warengruppe === w ? 'active' : ''}
                onClick={() => { tap(); patchWg({ warengruppe: w, wgFrei: false }); wgNext() }}
              >
                {w}
              </button>
            ))}
            <button type="button" className={entry.wgFrei ? 'active' : ''} onClick={() => patchWg({ wgFrei: true, warengruppe: '' })}>
              ✎ Eigene
            </button>
          </div>
          {entry.wgFrei && (
            <>
              <label className="field">
                <span>Eigene Warengruppe</span>
                <input value={entry.warengruppe || ''} onChange={(e) => patchWg({ warengruppe: e.target.value })} placeholder="Warengruppe eingeben" />
              </label>
              <button className="btn" onClick={() => { tap(); wgNext() }}>Weiter →</button>
            </>
          )}
        </div>
      )
    if (s === 1)
      return (
        <div className="card">
          <div className="wizard-q">Verlust der Warengruppe</div>
          <div className="row">
            <label className="field">
              <span>Verlust in €</span>
              <SignedInput value={entry.verlustEuro} onChange={(v) => patchWg({ verlustEuro: v })} defaultNegative autoFocus />
            </label>
            <label className="field">
              <span>Verlust in %</span>
              <SignedInput value={entry.verlustProzent} onChange={(v) => patchWg({ verlustProzent: v })} defaultNegative />
            </label>
          </div>
          <button className="btn" onClick={() => { tap(); wgNext() }}>Weiter →</button>
        </div>
      )
    if (s === 2) return screenUrsache(entry, patchWg, wgNext)
    if (s === 3) return screenUmsetzung(entry, patchWg, wgNext)
    return screenNachkontrolle(entry, patchWg, wgNext)
  }

  function renderArtHub() {
    return (
      <div className="card">
        <h2>Artikel</h2>
        <h3>Analyse der auffälligsten Artikel</h3>
        {bogen.artikel.length === 0 && <p className="muted">Noch kein Artikel erfasst.</p>}
        {bogen.artikel.map((a, i) => (
          <div className="list-item" key={a.id}>
            <div className="grow" onClick={() => { tap(); setView({ v: 'art', i, step: 0 }) }}>
              <div className="title">{a.artikelName || '(ohne Name)'}</div>
              <div className="sub">
                Verlust {a.verlustEuro || '–'} € · {a.verlustProzent || '–'} %
                {a.ursachen?.length ? ` · ${a.ursachen.length} Ursache(n)` : ''}
              </div>
            </div>
            <button className="btn small secondary" onClick={() => { tap(); setView({ v: 'art', i, step: 0 }) }}>Bearbeiten</button>
            <button className="btn small danger" onClick={() => delArt(i)}>✕</button>
          </div>
        ))}
        <button className="btn ghost" onClick={addArt}>＋ Artikel hinzufügen</button>
        <div className="nav-buttons">
          <button className="btn secondary" onClick={() => setView({ v: 'wgHub' })}>← Zurück</button>
          <button className="btn" onClick={() => setView({ v: 'abschluss' })}>Weiter zum Abschluss →</button>
        </div>
      </div>
    )
  }

  function renderArtEntry() {
    const entry = bogen.artikel[view.i]
    if (!entry)
      return (
        <div className="card">
          <button className="btn" onClick={() => setView({ v: 'artHub' })}>Zur Übersicht</button>
        </div>
      )
    const s = view.step
    if (s === 0)
      return (
        <div className="card">
          <div className="wizard-q">Welcher Artikel?</div>
          <label className="field">
            <span>Artikel-Name (tippen zum Suchen)</span>
            <input
              autoFocus
              value={entry.artikelName || ''}
              onChange={(e) => patchArt({ artikelName: e.target.value })}
            />
          </label>
          {(() => {
            const q = (entry.artikelName || '').trim().toLowerCase()
            const treffer = artikelStamm
              .filter((a) => (q ? a.name.toLowerCase().includes(q) : true))
              .filter((a) => a.name.toLowerCase() !== q)
              .slice(0, 8)
            if (treffer.length === 0) return null
            return (
              <>
                <p className="hint">Aus dem Artikelstamm übernehmen:</p>
                {treffer.map((a) => (
                  <button
                    key={a.id}
                    className="opt"
                    onClick={() => {
                      tap()
                      const wg = bogen.warengruppen.find(
                        (w) => (w.warengruppe || '').trim() === (a.warengruppe || '').trim() && a.warengruppe
                      )
                      if (wg) {
                        patchArt({ artikelName: a.name, warengruppeId: wg.id })
                        setView({ v: 'art', i: view.i, step: 2 })
                      } else {
                        patchArt({ artikelName: a.name })
                        artNext()
                      }
                    }}
                  >
                    <div>{a.name}</div>
                    {a.warengruppe && <div className="opt-sub">{a.warengruppe}</div>}
                  </button>
                ))}
              </>
            )
          })()}
          <button className="btn" disabled={!(entry.artikelName || '').trim()} onClick={() => { tap(); artNext() }}>Weiter →</button>
        </div>
      )
    if (s === 1) {
      const opts = bogen.warengruppen.filter((w) => (w.warengruppe || '').trim())
      return (
        <div className="card">
          <div className="wizard-q">Zu welcher Warengruppe gehört der Artikel?</div>
          <p className="hint">Für die automatische %-Berechnung (Anteil am Warengruppen-Verlust).</p>
          {opts.map((w) => (
            <button
              key={w.id}
              className={`opt ${entry.warengruppeId === w.id ? 'selected' : ''}`}
              onClick={() => { tap(); patchArt({ warengruppeId: w.id }); artNext() }}
            >
              <div>{w.warengruppe}</div>
              <div className="opt-sub">Verlust {w.verlustEuro || '?'} €</div>
            </button>
          ))}
          <button
            className={`opt ${!entry.warengruppeId ? 'selected' : ''}`}
            onClick={() => { tap(); patchArt({ warengruppeId: '' }); artNext() }}
          >
            <div>Ohne Zuordnung</div>
            <div className="opt-sub">% manuell eingeben</div>
          </button>
        </div>
      )
    }
    if (s === 2) {
      const selWg = bogen.warengruppen.find((w) => w.id === entry.warengruppeId) || null
      const wgEuro = selWg ? parseNum(selWg.verlustEuro) : null
      const auto = !!selWg
      const livePct = auto ? berechnePct(entry.verlustEuro, wgEuro) : entry.verlustProzent
      return (
        <div className="card">
          <div className="wizard-q">Verlust des Artikels</div>
          <label className="field">
            <span>Verlust in €</span>
            <SignedInput
              value={entry.verlustEuro}
              onChange={(v) => patchArt(auto ? { verlustEuro: v, verlustProzent: berechnePct(v, wgEuro) } : { verlustEuro: v })}
              defaultNegative
              autoFocus
            />
          </label>
          {auto ? (
            <label className="field">
              <span>Verlust in % (auto)</span>
              <input
                readOnly
                value={livePct !== '' ? `${livePct} %` : '—'}
                style={parseNum(livePct) < 0 ? { color: 'var(--red)', fontWeight: 700 } : undefined}
              />
            </label>
          ) : (
            <label className="field">
              <span>Verlust in %</span>
              <SignedInput value={entry.verlustProzent} onChange={(v) => patchArt({ verlustProzent: v })} defaultNegative />
            </label>
          )}
          {auto && (
            <p className="hint">
              {selWg.warengruppe} · {selWg.verlustEuro || '?'} € — Anteil {livePct !== '' ? `${livePct} %` : '—'}
            </p>
          )}
          <button className="btn" onClick={() => { tap(); artNext() }}>Weiter →</button>
        </div>
      )
    }
    if (s === 3) return screenUrsache(entry, patchArt, artNext)
    if (s === 4) return screenUmsetzung(entry, patchArt, artNext)
    return screenNachkontrolle(entry, patchArt, artNext)
  }

  function renderAbschluss() {
    return (
      <div className="card">
        <h2>Abschluss &amp; Export</h2>
        <div className="card" style={{ background: 'var(--bg)' }}>
          <h3>Übersicht</h3>
          <p className="muted">
            Filiale {bogen.filialeNummer} · {bogen.datum} · Inventur-Nr. {bogen.inventurNr}
            <br />
            Ergebnis {bogen.ergebnis || '–'} % / Vorgabe {bogen.vorgabe || '–'} %{' '}
            {diffText && <span className={`badge ${schlechter ? 'warn' : ''}`}>Diff. {diffText}</span>}
          </p>
          <button className="btn small secondary" onClick={() => setView({ v: 'kopf', step: 0 })}>Kopfdaten bearbeiten</button>
          <button className="btn small secondary" onClick={() => setView({ v: 'wgHub' })}>Warengruppen ({bogen.warengruppen.length})</button>
          <button className="btn small secondary" onClick={() => setView({ v: 'artHub' })}>Artikel ({bogen.artikel.length})</button>
        </div>
        <label className="field">
          <span>Name ML</span>
          <input value={bogen.nameMl} onChange={(e) => setB({ nameMl: e.target.value })} />
        </label>
        <label className="field">
          <span>Name VL</span>
          <input value={bogen.nameVl} onChange={(e) => setB({ nameVl: e.target.value })} />
        </label>
        <button className="btn green" onPointerDown={dateiVorbereiten} onClick={handleShare}>
          📤 Teilen
        </button>
        <button className="btn secondary" onClick={handleDownload}>⬇ Nur herunterladen</button>
        <div className="nav-buttons">
          <button className="btn secondary" onClick={() => setView({ v: 'artHub' })}>← Zurück</button>
        </div>
      </div>
    )
  }

  const titel =
    view.v === 'kopf'
      ? 'Kopfdaten'
      : view.v === 'wgHub'
        ? 'Warengruppen'
        : view.v === 'wg'
          ? `Warengruppe ${view.i + 1}`
          : view.v === 'artHub'
            ? 'Artikel'
            : view.v === 'art'
              ? `Artikel ${view.i + 1}`
              : 'Abschluss'

  let body
  if (view.v === 'kopf') body = renderKopf()
  else if (view.v === 'wgHub') body = renderWgHub()
  else if (view.v === 'wg') body = renderWgEntry()
  else if (view.v === 'artHub') body = renderArtHub()
  else if (view.v === 'art') body = renderArtEntry()
  else body = renderAbschluss()

  const curSection = sectionIndex(view.v)

  return (
    <>
      <div className="topbar">
        <button className="back-btn" onClick={back}>‹ Zurück</button>
        <h1>{titel}</h1>
        <button className="home-btn" onClick={goHome} title="Zum Startbildschirm (Entwurf wird gesichert)">
          🏠
        </button>
      </div>
      <div className="step-indicator">
        {[0, 1, 2, 3].map((idx) => (
          <div className={`dot ${idx <= curSection ? 'active' : ''}`} key={idx} />
        ))}
      </div>
      {body}
    </>
  )
}
