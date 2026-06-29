import { URSACHEN_LISTE } from '../data/ursachenListe.js'
import { WARENGRUPPEN } from '../data/warengruppenListe.js'
import SignedInput from './SignedInput.jsx'
import { handleEnterNext } from '../utils/formNav.js'

const FREITEXT = '__frei__'

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

export default function EintragForm({
  entry,
  index,
  label,
  firstKey,
  onChange,
  onRemove,
  vorlagen = [],
  onSaveVorlage,
}) {
  const set = (patch) => onChange({ ...entry, ...patch })

  // Maßnahme zu einer Ursache (feste Liste oder eigene Vorlage) finden.
  const massnahmeFor = (urs) => {
    const found =
      vorlagen.find((v) => v.ursache === urs) || URSACHEN_LISTE.find((u) => u.ursache === urs)
    return found ? found.massnahme : ''
  }
  const istBekannt =
    URSACHEN_LISTE.some((u) => u.ursache === entry.ursache) ||
    vorlagen.some((v) => v.ursache === entry.ursache)
  const selectValue = entry.ursacheFrei
    ? FREITEXT
    : istBekannt
      ? entry.ursache
      : entry.ursache
        ? FREITEXT
        : ''

  const handleUrsacheSelect = (val) => {
    if (val === FREITEXT) {
      set({ ursacheFrei: true, ursache: '' })
    } else {
      // Bekannte Ursache / Vorlage: Maßnahme automatisch vorausfüllen
      set({ ursacheFrei: false, ursache: val, massnahme: massnahmeFor(val) })
    }
  }

  // Aktuelle Freitext-Eingabe als Vorlage speicherbar?
  const kannSpeichern =
    entry.ursacheFrei && (entry.ursache || '').trim() && (entry.massnahme || '').trim()
  const bereitsVorlage = vorlagen.some(
    (v) => v.ursache.trim().toLowerCase() === (entry.ursache || '').trim().toLowerCase()
  )

  const handleSaveVorlage = () => {
    if (!kannSpeichern || !onSaveVorlage) return
    onSaveVorlage({ ursache: entry.ursache.trim(), massnahme: entry.massnahme.trim() })
    // Eintrag auf die gespeicherte (nun bekannte) Vorlage umstellen
    set({ ursacheFrei: false })
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

      <label className="field">
        <span>{label}{firstKey === 'artikelName' ? '-Name' : ''}</span>
        <input
          value={entry[firstKey] || ''}
          onChange={(e) => set({ [firstKey]: e.target.value })}
          placeholder={
            firstKey === 'artikelName'
              ? 'z.B. Clarkys Pistazien'
              : 'Warengruppe wählen oder eingeben'
          }
          list={firstKey === 'warengruppe' ? `wg-list-${entry.id}` : undefined}
          enterKeyHint="next"
        />
        {firstKey === 'warengruppe' && (
          <datalist id={`wg-list-${entry.id}`}>
            {WARENGRUPPEN.map((w) => (
              <option value={w} key={w} />
            ))}
          </datalist>
        )}
      </label>

      <div className="row">
        <label className="field">
          <span>Verlust in €</span>
          <SignedInput
            value={entry.verlustEuro}
            onChange={(v) => set({ verlustEuro: v })}
            placeholder="10392"
          />
        </label>
        <label className="field">
          <span>Verlust in %</span>
          <SignedInput
            value={entry.verlustProzent}
            onChange={(v) => set({ verlustProzent: v })}
            placeholder="3,24"
          />
        </label>
      </div>

      <label className="field">
        <span>Ursache (Was läuft konkret falsch?)</span>
        <select value={selectValue} onChange={(e) => handleUrsacheSelect(e.target.value)}>
          <option value="">— bitte wählen —</option>
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
      </label>

      {entry.ursacheFrei && (
        <label className="field">
          <span>Eigene Ursache</span>
          <input
            value={entry.ursache || ''}
            onChange={(e) => set({ ursache: e.target.value })}
            placeholder="Ursache frei eingeben"
            enterKeyHint="next"
          />
        </label>
      )}

      <label className="field">
        <span>Maßnahme (Was wird ab morgen geändert?)</span>
        <textarea
          value={entry.massnahme || ''}
          onChange={(e) => set({ massnahme: e.target.value })}
          placeholder="Maßnahme – wird bei Auswahl automatisch vorgeschlagen, frei überschreibbar"
        />
      </label>

      {entry.ursacheFrei && (
        <button
          type="button"
          className="btn ghost small"
          style={{ marginBottom: 14 }}
          disabled={!kannSpeichern}
          onClick={handleSaveVorlage}
        >
          {bereitsVorlage ? '★ Vorlage aktualisieren' : '★ Als Vorlage speichern'}
        </button>
      )}

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

      <div className="row" style={{ marginTop: 14 }}>
        <label className="field">
          <span>Datum Nachkontrolle</span>
          <input
            type="date"
            value={entry.datumNachkontrolle || ''}
            onChange={(e) => set({ datumNachkontrolle: e.target.value })}
          />
        </label>
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
