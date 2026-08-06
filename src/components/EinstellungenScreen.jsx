import { useState } from 'react'
import {
  getProfil,
  saveProfil,
  uid,
  getVorlagen,
  deleteVorlage,
  getNkFavoriten,
  deleteNkFavorit,
  getArtikelStamm,
  deleteArtikelStamm,
  getGeloeschteUrsachen,
  restoreUrsache,
} from '../store.js'
import SignedInput from './SignedInput.jsx'
import { handleEnterNext } from '../utils/formNav.js'

export default function EinstellungenScreen({ go }) {
  const [profil, setProfil] = useState(() => getProfil())
  const [saved, setSaved] = useState(false)
  const [vorlagen, setVorlagen] = useState(() => getVorlagen())
  const [nkFavoriten, setNkFavoriten] = useState(() => getNkFavoriten())

  const [artikelStamm, setArtikelStamm] = useState(() => getArtikelStamm())
  const [geloescht, setGeloescht] = useState(() => getGeloeschteUrsachen())
  const [artFilter, setArtFilter] = useState('')

  const removeVorlage = (id) => setVorlagen(deleteVorlage(id))
  const removeNkFavorit = (t) => setNkFavoriten(deleteNkFavorit(t))
  const removeArtikel = (id) => setArtikelStamm(deleteArtikelStamm(id))
  const restoreUrs = (name) => setGeloescht(restoreUrsache(name))

  const update = (patch) => {
    setProfil((p) => ({ ...p, ...patch }))
    setSaved(false)
  }

  const updateFiliale = (id, patch) => {
    update({
      filialen: profil.filialen.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })
  }

  const addFiliale = () => {
    update({
      filialen: [...profil.filialen, { id: uid(), nummer: '', mlName: '', zielvorgabe: '' }],
    })
  }

  const removeFiliale = (id) => {
    update({ filialen: profil.filialen.filter((f) => f.id !== id) })
  }

  const handleSave = () => {
    saveProfil(profil)
    setSaved(true)
  }

  return (
    <>
      <div className="topbar">
        <button className="back-btn" onClick={() => go('home')}>
          ‹ Zurück
        </button>
        <h1>Einstellungen</h1>
      </div>

      <div className="card">
        <h2>Verkaufsleiter</h2>
        <label className="field">
          <span>VL-Name</span>
          <input
            value={profil.vlName}
            onChange={(e) => update({ vlName: e.target.value })}
          />
        </label>
      </div>

      <div className="card">
        <h2>Filialen</h2>
        {profil.filialen.length === 0 && (
          <p className="muted">Noch keine Filiale angelegt.</p>
        )}
        {profil.filialen.map((f, i) => (
          <div className="entry" key={f.id} onKeyDown={handleEnterNext}>
            <div className="entry-head">
              <strong>Filiale {i + 1}</strong>
              <button className="icon-btn" onClick={() => removeFiliale(f.id)}>
                Löschen
              </button>
            </div>
            <label className="field">
              <span>Filiale-Nummer</span>
              <input
                value={f.nummer}
                onChange={(e) => updateFiliale(f.id, { nummer: e.target.value })}
                inputMode="numeric"
                enterKeyHint="next"
              />
            </label>
            <label className="field">
              <span>ML-Name (Marktleiter)</span>
              <input
                value={f.mlName}
                onChange={(e) => updateFiliale(f.id, { mlName: e.target.value })}
                enterKeyHint="next"
              />
            </label>
            <label className="field">
              <span>Inventurvorgabe / Zielvorgabe in %</span>
              <SignedInput
                value={f.zielvorgabe || ''}
                onChange={(v) => updateFiliale(f.id, { zielvorgabe: v })}
              />
            </label>
          </div>
        ))}
        <button className="btn ghost" onClick={addFiliale}>
          ＋ Filiale hinzufügen
        </button>
      </div>

      <div className="card">
        <h2>Eigene Vorlagen</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Selbst gespeicherte Ursachen &amp; Maßnahmen. Erstellt werden sie direkt bei der Erfassung
          über „★ Als Vorlage speichern".
        </p>
        {vorlagen.length === 0 ? (
          <p className="muted">Noch keine eigenen Vorlagen.</p>
        ) : (
          vorlagen.map((v) => (
            <div className="list-item" key={v.id}>
              <div className="grow">
                <div className="title">{v.ursache}</div>
                <div className="sub">{v.massnahme}</div>
              </div>
              <button className="btn small danger" onClick={() => removeVorlage(v.id)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Artikelstamm</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Erfasste Artikel werden automatisch gemerkt und stehen bei der Erfassung zur Schnellauswahl.
        </p>
        {artikelStamm.length === 0 ? (
          <p className="muted">Noch keine Artikel gespeichert.</p>
        ) : (
          <>
            <label className="field">
              <span>Suchen ({artikelStamm.length} Artikel)</span>
              <input value={artFilter} onChange={(e) => setArtFilter(e.target.value)} />
            </label>
            {artikelStamm
              .filter((a) => a.name.toLowerCase().includes(artFilter.trim().toLowerCase()))
              .slice(0, 50)
              .map((a) => (
                <div className="list-item" key={a.id}>
                  <div className="grow">
                    <div className="title">{a.name}</div>
                    {a.warengruppe && <div className="sub">{a.warengruppe}</div>}
                  </div>
                  <button className="btn small danger" onClick={() => removeArtikel(a.id)}>
                    ✕
                  </button>
                </div>
              ))}
          </>
        )}
      </div>

      <div className="card">
        <h2>Gelöschte Ursachen</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Bei der Erfassung per ✕ ausgeblendete Ursachen. Hier wiederherstellbar.
        </p>
        {geloescht.length === 0 ? (
          <p className="muted">Keine Ursachen ausgeblendet.</p>
        ) : (
          geloescht.map((name) => (
            <div className="list-item" key={name}>
              <div className="grow">
                <div className="title">{name}</div>
              </div>
              <button className="btn small secondary" onClick={() => restoreUrs(name)}>
                ↩ Wiederherstellen
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Favoriten „Datum Nachkontrolle"</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Eigene Einträge wie „regelmäßig". Erstellt werden sie bei der Erfassung über „★ als
          Favorit speichern". (Voreingestellt: regelmäßig, wöchentlich, 14-tägig, monatlich)
        </p>
        {nkFavoriten.length === 0 ? (
          <p className="muted">Noch keine eigenen Favoriten.</p>
        ) : (
          nkFavoriten.map((t) => (
            <div className="list-item" key={t}>
              <div className="grow">
                <div className="title">{t}</div>
              </div>
              <button className="btn small danger" onClick={() => removeNkFavorit(t)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <button className="btn" onClick={handleSave}>
        Speichern
      </button>
      {saved && (
        <p className="muted" style={{ textAlign: 'center', color: 'var(--green)' }}>
          ✓ Gespeichert
        </p>
      )}
    </>
  )
}
