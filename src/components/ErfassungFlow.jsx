import { useState } from 'react'
import {
  getProfil,
  getFiliale,
  getBogen,
  saveBogen,
  uid,
  getVorlagen,
  saveVorlage,
} from '../store.js'
import { exportBogen } from '../utils/exportXlsx.js'
import EintragForm from './EintragForm.jsx'
import SignedInput from './SignedInput.jsx'
import { handleEnterNext } from '../utils/formNav.js'

// Keine Begrenzung der Anzahl an Warengruppen/Artikeln.

function heute() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function neuerEintrag(firstKey) {
  return {
    id: uid(),
    [firstKey]: '',
    warengruppeId: '', // nur für Artikel: Referenz auf eine Warengruppe (für %-Berechnung)
    verlustEuro: '',
    verlustProzent: '',
    ursache: '',
    ursacheFrei: false,
    massnahme: '',
    umsetzungChecks: { ML: false, MLV: false, VL: false },
    umsetzungFrei: '',
    kontrolleChecks: { ML: false, MLV: false, VL: false },
    kontrolleFrei: '',
    datumNachkontrolle: '',
    io: '',
  }
}

function neuerBogen(profil) {
  const erste = profil.filialen[0] || { id: '', nummer: '' }
  return {
    id: uid(),
    filialeId: erste.id,
    filialeNummer: erste.nummer,
    datum: heute(),
    inventurNr: '1',
    ergebnis: '',
    vorgabe: erste.zielvorgabe || '',
    eas: true,
    kamera: true,
    personaldelikte: '0',
    kuehlschaeden: '0',
    warengruppen: [],
    artikel: [],
    nameMl: erste.mlName || '',
    nameVl: profil.vlName || '',
    createdAt: new Date().toISOString(),
  }
}

export default function ErfassungFlow({ go, bogenId }) {
  const profil = getProfil()
  const [step, setStep] = useState(1)
  const [bogen, setBogen] = useState(() => {
    if (bogenId) {
      const vorhanden = getBogen(bogenId)
      if (vorhanden) return vorhanden
    }
    return neuerBogen(profil)
  })
  const [vorlagen, setVorlagen] = useState(() => getVorlagen())

  const addVorlage = (v) => setVorlagen(saveVorlage(v))

  const set = (patch) => setBogen((b) => ({ ...b, ...patch }))

  // Filiale-Wechsel: Nummer, ML-Name und Zielvorgabe mitführen
  const handleFiliale = (id) => {
    const f = getFiliale(id)
    set({
      filialeId: id,
      filialeNummer: f ? f.nummer : '',
      nameMl: f && f.mlName ? f.mlName : bogen.nameMl,
      vorgabe: f && f.zielvorgabe ? f.zielvorgabe : bogen.vorgabe,
    })
  }

  // --- Einträge verwalten ---
  const updateEntry = (listKey, entry) =>
    set({ [listKey]: bogen[listKey].map((e) => (e.id === entry.id ? entry : e)) })
  const removeEntry = (listKey, id) =>
    set({ [listKey]: bogen[listKey].filter((e) => e.id !== id) })
  const addEntry = (listKey, firstKey) => {
    set({ [listKey]: [...bogen[listKey], neuerEintrag(firstKey)] })
  }

  // Artikel-Prozente aus dem €-Anteil der gewählten Warengruppe neu berechnen,
  // damit der Export auch nach späteren Änderungen korrekt ist.
  const mitArtikelProzenten = (b) => ({
    ...b,
    artikel: b.artikel.map((a) => {
      if (!a.warengruppeId) return a
      const wg = b.warengruppen.find((w) => w.id === a.warengruppeId)
      const wEuro = parseNum(wg && wg.verlustEuro)
      const aEuro = parseNum(a.verlustEuro)
      if (wEuro && wEuro !== 0 && aEuro !== null) {
        return { ...a, verlustProzent: String(Math.round((aEuro / wEuro) * 10000) / 100) }
      }
      return a
    }),
  })

  const handleExport = async () => {
    const fertig = mitArtikelProzenten(bogen)
    saveBogen(fertig)
    try {
      await exportBogen(fertig)
    } catch (err) {
      alert('Export fehlgeschlagen: ' + err.message)
      return
    }
    go('archiv')
  }

  // Zahl parsen (deutsches Komma erlaubt), leer/ungültig -> null
  const parseNum = (v) => {
    const s = String(v ?? '').trim().replace(',', '.')
    if (s === '') return null
    const n = Number(s)
    return isFinite(n) ? n : null
  }
  const ergNum = parseNum(bogen.ergebnis)
  const vorNum = parseNum(bogen.vorgabe)
  const beideBekannt = ergNum !== null && vorNum !== null
  const schlechter = beideBekannt && ergNum < vorNum
  const differenz = beideBekannt ? Math.round((ergNum - vorNum) * 100) / 100 : null
  const differenzText =
    differenz === null ? null : `${differenz.toLocaleString('de-DE', { minimumFractionDigits: 2 })} %`

  return (
    <>
      <div className="topbar">
        <button
          className="back-btn"
          onClick={() => (step > 1 ? setStep(step - 1) : go('home'))}
        >
          ‹ Zurück
        </button>
        <h1>Bogen · Schritt {step}/4</h1>
      </div>

      <div className="step-indicator">
        {[1, 2, 3, 4].map((s) => (
          <div className={`dot ${s <= step ? 'active' : ''}`} key={s} />
        ))}
      </div>

      {/* ---------------- Schritt 1: Kopfdaten ---------------- */}
      {step === 1 && (
        <div className="card" onKeyDown={handleEnterNext}>
          <h2>Kopfdaten</h2>
          <label className="field">
            <span>Filiale</span>
            <select value={bogen.filialeId} onChange={(e) => handleFiliale(e.target.value)}>
              {profil.filialen.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.nummer} {f.mlName ? `– ${f.mlName}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Datum</span>
            <input type="date" value={bogen.datum} onChange={(e) => set({ datum: e.target.value })} />
          </label>

          <label className="field">
            <span>Inventur-Nr. im laufenden Jahr</span>
            <input
              value={bogen.inventurNr}
              onChange={(e) => set({ inventurNr: e.target.value })}
              inputMode="numeric"
              enterKeyHint="next"
            />
          </label>

          <div className="row">
            <label className="field">
              <span>Inventurergebnis in %</span>
              <SignedInput
                value={bogen.ergebnis}
                onChange={(v) => set({ ergebnis: v })}
                placeholder="1,66"
              />
            </label>
            <label className="field">
              <span>Inventurvorgabe in %</span>
              <SignedInput
                value={bogen.vorgabe}
                onChange={(v) => set({ vorgabe: v })}
                placeholder="0,89"
              />
            </label>
          </div>

          {beideBekannt && (
            <p className="hint">
              {schlechter ? (
                <span className="badge warn">Schlechter als Zielvorgabe · {differenzText}</span>
              ) : (
                <span className="badge">Im Rahmen der Zielvorgabe · {differenzText}</span>
              )}
            </p>
          )}

          <label className="field">
            <span>EAS-Anlage vorhanden</span>
            <div className="toggle-group">
              <button
                type="button"
                className={bogen.eas ? 'active green' : ''}
                onClick={() => set({ eas: true })}
              >
                ja
              </button>
              <button
                type="button"
                className={!bogen.eas ? 'active red' : ''}
                onClick={() => set({ eas: false })}
              >
                nein
              </button>
            </div>
          </label>

          <label className="field">
            <span>Kamera-Konzept vorhanden</span>
            <div className="toggle-group">
              <button
                type="button"
                className={bogen.kamera ? 'active green' : ''}
                onClick={() => set({ kamera: true })}
              >
                ja
              </button>
              <button
                type="button"
                className={!bogen.kamera ? 'active red' : ''}
                onClick={() => set({ kamera: false })}
              >
                nein
              </button>
            </div>
          </label>

          <label className="field">
            <span>Personaldelikte im Zeitraum</span>
            <input
              value={bogen.personaldelikte}
              onChange={(e) => set({ personaldelikte: e.target.value })}
              inputMode="numeric"
              enterKeyHint="next"
            />
          </label>

          <label className="field">
            <span>Kühlschäden TS/TK in €</span>
            <input
              value={bogen.kuehlschaeden}
              onChange={(e) => set({ kuehlschaeden: e.target.value })}
              inputMode="decimal"
              enterKeyHint="done"
            />
          </label>

          <button className="btn" onClick={() => setStep(2)}>
            Weiter →
          </button>
        </div>
      )}

      {/* ---------------- Schritt 2: Warengruppen ---------------- */}
      {step === 2 && (
        <div className="card">
          <h2>Warengruppen</h2>
          <h3>Analyse der auffälligsten Warengruppen</h3>
          {bogen.warengruppen.length === 0 && (
            <p className="muted">Noch kein Eintrag. Optional – du kannst auch direkt weiter.</p>
          )}
          {bogen.warengruppen.map((e, i) => (
            <EintragForm
              key={e.id}
              entry={e}
              index={i}
              label="Warengruppe"
              firstKey="warengruppe"
              vorlagen={vorlagen}
              onSaveVorlage={addVorlage}
              onChange={(upd) => updateEntry('warengruppen', upd)}
              onRemove={() => removeEntry('warengruppen', e.id)}
            />
          ))}
          <button className="btn ghost" onClick={() => addEntry('warengruppen', 'warengruppe')}>
            ＋ Eintrag hinzufügen
          </button>
          <div className="nav-buttons">
            <button className="btn secondary" onClick={() => setStep(1)}>
              ← Zurück
            </button>
            <button className="btn" onClick={() => setStep(3)}>
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Schritt 3: Artikel ---------------- */}
      {step === 3 && (
        <div className="card">
          <h2>Artikel</h2>
          <h3>Analyse der auffälligsten Artikel</h3>
          {bogen.artikel.length === 0 && (
            <p className="muted">Noch kein Eintrag. Optional – du kannst auch direkt weiter.</p>
          )}
          {bogen.artikel.map((e, i) => (
            <EintragForm
              key={e.id}
              entry={e}
              index={i}
              label="Artikel"
              firstKey="artikelName"
              vorlagen={vorlagen}
              onSaveVorlage={addVorlage}
              warengruppenOptions={bogen.warengruppen
                .filter((w) => (w.warengruppe || '').trim())
                .map((w) => ({ id: w.id, name: w.warengruppe, euro: w.verlustEuro }))}
              onChange={(upd) => updateEntry('artikel', upd)}
              onRemove={() => removeEntry('artikel', e.id)}
            />
          ))}
          <button className="btn ghost" onClick={() => addEntry('artikel', 'artikelName')}>
            ＋ Eintrag hinzufügen
          </button>
          <div className="nav-buttons">
            <button className="btn secondary" onClick={() => setStep(2)}>
              ← Zurück
            </button>
            <button className="btn" onClick={() => setStep(4)}>
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Schritt 4: Unterschriften & Export ---------------- */}
      {step === 4 && (
        <div className="card">
          <h2>Unterschriften & Export</h2>
          <label className="field">
            <span>Name ML</span>
            <input value={bogen.nameMl} onChange={(e) => set({ nameMl: e.target.value })} />
          </label>
          <label className="field">
            <span>Name VL</span>
            <input value={bogen.nameVl} onChange={(e) => set({ nameVl: e.target.value })} />
          </label>

          <div className="card" style={{ background: 'var(--bg)' }}>
            <h3>Zusammenfassung</h3>
            <p className="muted">
              Filiale {bogen.filialeNummer} · {bogen.datum} · Inventur-Nr. {bogen.inventurNr}
              <br />
              Ergebnis {bogen.ergebnis || '–'} % / Vorgabe {bogen.vorgabe || '–'} %{' '}
              {differenzText && (
                <span className={`badge ${schlechter ? 'warn' : ''}`}>Diff. {differenzText}</span>
              )}
              <br />
              {bogen.warengruppen.length} Warengruppe(n) · {bogen.artikel.length} Artikel
            </p>
          </div>

          <button className="btn green" onClick={handleExport}>
            ⬇ Als .xlsx exportieren
          </button>
          <div className="nav-buttons">
            <button className="btn secondary" onClick={() => setStep(3)}>
              ← Zurück
            </button>
          </div>
        </div>
      )}
    </>
  )
}
