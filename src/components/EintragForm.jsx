import { useState } from 'react'
import { URSACHEN_LISTE } from '../data/ursachenListe.js'
import { WARENGRUPPEN } from '../data/warengruppenListe.js'
import SignedInput from './SignedInput.jsx'
import { handleEnterNext } from '../utils/formNav.js'

const FREITEXT = '__frei__'
const WG_FREITEXT = '__wgfrei__'
// Vordefinierte Intervalle für "Datum Nachkontrolle"
const NK_PRESETS = ['regelmäßig', 'wöchentlich', '14-tägig', 'monatlich']

// Gruppiert die Ursachen nach Kategorie für die optgroups.
const GRUPPEN = URSACHEN_LISTE.reduce((acc, u) => {
  ;(acc[u.kategorie] = acc[u.kategorie] || []).push(u)
  return acc
}, {})

function Checks({ value, frei, onChecks, onFrei }) {
  const toggle = (key) => onChecks({ ...value, [key]: !value[key] })
  return (
    <>
      <div className="checks">
        {['ML', 'MLV', 'VL'].map((k) => (
          <button
            type="button"
            key={k}
            className={value[k] ? 'active' : ''}
            onClick={() => toggle(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <input
        style={{ marginTop: 8 }}
        value={frei}
        onChange={(e) => onFrei(e.target.value)}
        placeholder="Zusatz (optional, z.B. Name)"
        enterKeyHint="next"
      />
    </>
  )
}

// Zahl parsen (deutsches Komma erlaubt), leer/ungültig -> null
function parseNum(v) {
  const s = String(v ?? '').trim().replace(',', '.')
  if (s === '' || s === '-') return null
  const n = Number(s)
  return isFinite(n) ? n : null
}

export default function EintragForm({
  entry,
  index,
  label,
  firstKey,
  onChange,
  onRemove,
  vorlagen = [],
  onSaveVorlage,
  warengruppenOptions = [],
  nkFavoriten = [],
  onSaveNkFavorit,
}) {
  const set = (patch) => onChange({ ...entry, ...patch })

  // --- Warengruppe als Dropdown (mit Freitext-Option) ---
  const wgIstBekannt = WARENGRUPPEN.includes(entry.warengruppe)
  const wgSelectValue = entry.wgFrei
    ? WG_FREITEXT
    : wgIstBekannt
      ? entry.warengruppe
      : entry.warengruppe
        ? WG_FREITEXT
        : ''
  const handleWgSelect = (val) => {
    if (val === WG_FREITEXT) set({ wgFrei: true, warengruppe: '' })
    else set({ wgFrei: false, warengruppe: val })
  }

  // --- Datum Nachkontrolle: Freitext + Favoriten ---
  const nkOptions = [...NK_PRESETS, ...nkFavoriten.filter((f) => !NK_PRESETS.includes(f))]
  const nkText = (entry.datumNachkontrolle || '').trim()
  const nkSchonFavorit = nkOptions.some((o) => o.toLowerCase() === nkText.toLowerCase())
  const handleSaveNk = () => {
    if (nkText && !nkSchonFavorit && onSaveNkFavorit) onSaveNkFavorit(nkText)
  }

  // --- Artikel: Warengruppe wählen, % automatisch aus €-Anteil berechnen ---
  const isArtikel = firstKey === 'artikelName'
  const selWg = warengruppenOptions.find((o) => o.id === entry.warengruppeId) || null
  const autoPct = isArtikel && !!selWg // %-Wert wird automatisch berechnet
  const wgEuro = selWg ? parseNum(selWg.euro) : null

  // Anteil des Artikel-€-Verlusts an der Warengruppe. Vorzeichen folgt dem
  // Artikel-€ (Verlust = negativ), daher Division durch den Betrag der WG.
  const berechnePct = (euroVal, wEuro) => {
    const a = parseNum(euroVal)
    if (a === null || wEuro === null || wEuro === 0) return ''
    return String(Math.round((a / Math.abs(wEuro)) * 10000) / 100)
  }
  // aktuell anzuzeigender (live berechneter) %-Wert für Artikel
  const livePct = autoPct ? berechnePct(entry.verlustEuro, wgEuro) : entry.verlustProzent

  const setEuro = (v) => {
    if (autoPct) set({ verlustEuro: v, verlustProzent: berechnePct(v, wgEuro) })
    else set({ verlustEuro: v })
  }
  const selectWg = (id) => {
    const o = warengruppenOptions.find((x) => x.id === id) || null
    const w = o ? parseNum(o.euro) : null
    set({ warengruppeId: id, verlustProzent: id ? berechnePct(entry.verlustEuro, w) : entry.verlustProzent })
  }

  // --- Ursachen: Mehrfachauswahl ---
  // Liste der gewählten Ursachen (abwärtskompatibel zur alten Einzel-Ursache).
  const ursachen = Array.isArray(entry.ursachen)
    ? entry.ursachen
    : entry.ursache
      ? [entry.ursache]
      : []

  // Maßnahme zu einer Ursache (feste Liste oder eigene Vorlage) finden.
  const massnahmeFor = (urs) => {
    const found =
      vorlagen.find((v) => v.ursache === urs) || URSACHEN_LISTE.find((u) => u.ursache === urs)
    return found ? found.massnahme : ''
  }

  const enthältZeile = (text, line) =>
    text.split('\n').some((l) => l.trim() === line.trim())
  const entferneZeile = (text, line) =>
    text
      .split('\n')
      .filter((l) => l.trim() !== line.trim())
      .join('\n')

  const addUrsache = (text) => {
    const t = (text || '').trim()
    if (!t || ursachen.includes(t)) return
    const m = massnahmeFor(t)
    let mass = entry.massnahme || ''
    if (m && !enthältZeile(mass, m)) mass = mass ? `${mass}\n${m}` : m
    set({ ursachen: [...ursachen, t], ursache: undefined, massnahme: mass })
  }
  const removeUrsache = (text) => {
    const m = massnahmeFor(text)
    let mass = entry.massnahme || ''
    if (m && enthältZeile(mass, m)) mass = entferneZeile(mass, m)
    set({ ursachen: ursachen.filter((u) => u !== text), massnahme: mass })
  }

  const handleAddSelect = (val) => {
    if (!val) return
    if (val === FREITEXT) {
      setShowFrei(true)
      return
    }
    addUrsache(val)
  }

  // Freitext-Ursache (lokaler Eingabezustand)
  const [showFrei, setShowFrei] = useState(false)
  const [freiText, setFreiText] = useState('')
  const freiKannSpeichern = freiText.trim() && (entry.massnahme || '').trim()

  const addFrei = () => {
    addUrsache(freiText)
    setFreiText('')
    setShowFrei(false)
  }
  const addFreiUndVorlage = () => {
    if (onSaveVorlage && freiKannSpeichern) {
      onSaveVorlage({ ursache: freiText.trim(), massnahme: (entry.massnahme || '').trim() })
    }
    addFrei()
  }

  return (
    <div className="entry" onKeyDown={handleEnterNext}>
      <div className="entry-head">
        <strong>
          {label} {index + 1}
        </strong>
        <button className="icon-btn" onClick={onRemove}>
          Löschen
        </button>
      </div>

      {firstKey === 'warengruppe' ? (
        <>
          <label className="field">
            <span>Warengruppe</span>
            <select value={wgSelectValue} onChange={(e) => handleWgSelect(e.target.value)}>
              <option value="">— bitte wählen —</option>
              {WARENGRUPPEN.map((w) => (
                <option value={w} key={w}>
                  {w}
                </option>
              ))}
              <option value={WG_FREITEXT}>✎ Eigener Text…</option>
            </select>
          </label>
          {entry.wgFrei && (
            <label className="field">
              <span>Eigene Warengruppe</span>
              <input
                value={entry.warengruppe || ''}
                onChange={(e) => set({ warengruppe: e.target.value })}
                placeholder="Warengruppe frei eingeben"
                enterKeyHint="next"
              />
            </label>
          )}
        </>
      ) : (
        <label className="field">
          <span>{label}-Name</span>
          <input
            value={entry[firstKey] || ''}
            onChange={(e) => set({ [firstKey]: e.target.value })}
            placeholder="z.B. Clarkys Pistazien"
            enterKeyHint="next"
          />
        </label>
      )}

      {isArtikel && (
        <label className="field">
          <span>Warengruppe (für %-Berechnung)</span>
          <select value={entry.warengruppeId || ''} onChange={(e) => selectWg(e.target.value)}>
            <option value="">— ohne / % manuell —</option>
            {warengruppenOptions.map((o) => (
              <option value={o.id} key={o.id}>
                {o.name}
                {parseNum(o.euro) !== null ? ` (${o.euro} €)` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="row">
        <label className="field">
          <span>Verlust in €</span>
          <SignedInput value={entry.verlustEuro} onChange={setEuro} placeholder="10392" defaultNegative />
        </label>
        {autoPct ? (
          <label className="field">
            <span>Verlust in % (auto)</span>
            <input
              readOnly
              value={livePct !== '' ? `${livePct} %` : '—'}
              title="Automatisch aus dem €-Anteil der Warengruppe berechnet"
              style={parseNum(livePct) < 0 ? { color: 'var(--red)', fontWeight: 700 } : undefined}
            />
          </label>
        ) : (
          <label className="field">
            <span>Verlust in %</span>
            <SignedInput
              value={entry.verlustProzent}
              onChange={(v) => set({ verlustProzent: v })}
              placeholder="3,24"
              defaultNegative
            />
          </label>
        )}
      </div>
      {autoPct && (
        <p className="hint">
          {selWg.name} {parseNum(selWg.euro) !== null ? `${selWg.euro} €` : ''} · Anteil dieses
          Artikels {livePct !== '' ? `${livePct} %` : '—'}
        </p>
      )}

      <div className="field">
        <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 5 }}>
          Ursache(n) – Was läuft konkret falsch? (mehrere möglich)
        </span>
        {ursachen.length > 0 && (
          <div className="checks" style={{ marginBottom: 10 }}>
            {ursachen.map((u) => (
              <button type="button" key={u} className="active" onClick={() => removeUrsache(u)}>
                {u} ✕
              </button>
            ))}
          </div>
        )}
        <select value="" onChange={(e) => handleAddSelect(e.target.value)}>
          <option value="">＋ Ursache hinzufügen…</option>
          {vorlagen.length > 0 && (
            <optgroup label="★ Eigene Vorlagen">
              {vorlagen.map((v) => (
                <option value={v.ursache} key={v.id}>
                  {v.ursache}
                </option>
              ))}
            </optgroup>
          )}
          {Object.entries(GRUPPEN).map(([kat, list]) => (
            <optgroup label={kat} key={kat}>
              {list.map((u) => (
                <option value={u.ursache} key={u.ursache}>
                  {u.ursache}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={FREITEXT}>✎ Eigener Text…</option>
        </select>
      </div>

      {showFrei && (
        <div className="field">
          <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 5 }}>
            Eigene Ursache
          </span>
          <input
            value={freiText}
            onChange={(e) => setFreiText(e.target.value)}
            placeholder="Ursache frei eingeben"
            enterKeyHint="done"
          />
          <div className="nav-buttons" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn secondary small"
              disabled={!freiText.trim()}
              onClick={addFrei}
            >
              Hinzufügen
            </button>
            <button
              type="button"
              className="btn ghost small"
              disabled={!freiKannSpeichern}
              onClick={addFreiUndVorlage}
              title="Ursache hinzufügen und als Vorlage speichern"
            >
              ★ + Vorlage
            </button>
          </div>
        </div>
      )}

      <label className="field">
        <span>Maßnahme (Was wird ab morgen geändert?)</span>
        <textarea
          value={entry.massnahme || ''}
          onChange={(e) => set({ massnahme: e.target.value })}
          placeholder="Maßnahme – wird bei Auswahl automatisch vorgeschlagen, frei überschreibbar"
        />
      </label>

      <label className="field">
        <span>Umsetzung durch</span>
      </label>
      <Checks
        value={entry.umsetzungChecks}
        frei={entry.umsetzungFrei}
        onChecks={(v) => set({ umsetzungChecks: v })}
        onFrei={(v) => set({ umsetzungFrei: v })}
      />

      <label className="field" style={{ marginTop: 14 }}>
        <span>Kontrolle durch</span>
      </label>
      <Checks
        value={entry.kontrolleChecks}
        frei={entry.kontrolleFrei}
        onChecks={(v) => set({ kontrolleChecks: v })}
        onFrei={(v) => set({ kontrolleFrei: v })}
      />

      <label className="field" style={{ marginTop: 14 }}>
        <span>Datum Nachkontrolle / Intervall</span>
        <input
          value={entry.datumNachkontrolle || ''}
          onChange={(e) => set({ datumNachkontrolle: e.target.value })}
          placeholder="z.B. 15.03.2026 oder regelmäßig"
          enterKeyHint="next"
        />
        <div className="checks" style={{ marginTop: 8 }}>
          {nkOptions.map((o) => (
            <button
              type="button"
              key={o}
              className={nkText.toLowerCase() === o.toLowerCase() ? 'active' : ''}
              onClick={() => set({ datumNachkontrolle: o })}
            >
              {o}
            </button>
          ))}
        </div>
        {nkText && !nkSchonFavorit && (
          <button
            type="button"
            className="btn ghost small"
            style={{ marginTop: 8 }}
            onClick={handleSaveNk}
          >
            ★ „{nkText}" als Favorit speichern
          </button>
        )}
      </label>

      <div className="row" style={{ marginTop: 14 }}>
        <label className="field">
          <span>I.O.?</span>
          <div className="toggle-group">
            <button
              type="button"
              className={entry.io === '' ? 'active' : ''}
              onClick={() => set({ io: '' })}
            >
              –
            </button>
            <button
              type="button"
              className={entry.io === 'ja' ? 'active green' : ''}
              onClick={() => set({ io: 'ja' })}
            >
              i.O.
            </button>
            <button
              type="button"
              className={entry.io === 'nein' ? 'active red' : ''}
              onClick={() => set({ io: 'nein' })}
            >
              nicht
            </button>
          </div>
        </label>
      </div>
    </div>
  )
}
