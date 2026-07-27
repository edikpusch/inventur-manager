# InventurManager – Projektkontext für Claude Code

## Projekt-Übersicht
React-PWA für Verkaufsleiter (VL) zur Erstellung von **Inventur-Bearbeitungsbögen** und Export als `.xlsx`.
- **Repo:** edikpusch/inventur-manager
- **Stack:** React + Vite + ExcelJS + localStorage (kein Backend)
- **Deploy:** Vercel (Auto-Deploy bei Push auf `main`)

## Fachlicher Ablauf
Bogen erfassen → als `.xlsx` teilen/exportieren → per WhatsApp ans iPad → in **Docs@Work** öffnen → per Firmen-Mail an den Betriebsrat.

**WICHTIG:** Docs@Work berechnet keine Excel-Formeln und interpretiert jedes `%` im Zahlenformat als echtes Prozentformat (× 100). Deshalb:
- Alle Werte in JS vorberechnen – **keine Excel-Formeln**.
- **Prozente als fertiger Text** in die Zelle schreiben (`"-3,59 %"`), ohne Zahlenformat (siehe `fmtProzentStr` in exportXlsx.js). Euro bleibt numerisch mit `#,##0.00 "€"`.

## Projektstruktur
```
src/
  components/
    HomeScreen.jsx         ← Start; zeigt Entwurf-Karte, Neuer Bogen, Archiv, Einstellungen
    EinstellungenScreen.jsx← VL-Name, Filialen (nummer, mlName, zielvorgabe), Vorlagen, NK-Favoriten
    ErfassungFlow.jsx      ← 4 Schritte als Sub-States (Kopfdaten, Warengruppen, Artikel, Export)
    EintragForm.jsx        ← Warengruppen-/Artikel-Eintrag (mehrere Ursachen, Auto-%)
    ArchivScreen.jsx       ← gespeicherte Bögen: Öffnen / Teilen / Download / Löschen
    SignedInput.jsx        ← Zahleneingabe mit ±-Umschalter (defaultNegative)
  data/
    ursachenListe.js       ← feste Ursachen + Maßnahmen (Kategorien A–I)
    warengruppenListe.js   ← vordefinierte Warengruppen (WG2–WG25)
  utils/
    exportXlsx.js          ← ExcelJS-Export, Share, Prozent-Neuberechnung
    formNav.js             ← Enter/„Weiter"-Taste springt zum nächsten Feld
  store.js                 ← localStorage lesen/schreiben
  App.jsx                  ← State-Router (kein react-router)
  main.jsx                 ← Entry + Service-Worker
```

## localStorage Keys (store.js)
- `im_profil`   → `{ vlName, filialen: [{ id, nummer, mlName, zielvorgabe }] }`
- `im_archiv`   → Array gespeicherter Bögen
- `im_vorlagen` → eigene Ursache/Maßnahme-Vorlagen `[{ id, ursache, massnahme }]`
- `im_nk_favoriten` → Favoriten für „Datum Nachkontrolle" (Array von Strings, z.B. "regelmäßig")
- `im_entwurf`  → **Auto-Save** des laufenden Bogens: `{ bogen, step }`

## Wichtige Systeme & Regeln

### Entwurf-System (Auto-Save) – `im_entwurf`
- ErfassungFlow speichert bei **jeder** Änderung an `bogen`/`step` **debounced (500 ms)** via `saveEntwurf(bogen, step)` (useEffect auf `[bogen, step]`, erster Lauf wird übersprungen, Timer in `saveTimer`-Ref).
- **HomeScreen** zeigt bei vorhandenem Entwurf eine Karte „Entwurf fortsetzen" (Filiale · Datum · Schritt x/4) mit **Fortsetzen** (`go('erfassung', { resumeEntwurf: true })`) und **Verwerfen** (`confirm()` → `clearEntwurf()`).
- **Neuer Bogen** bei vorhandenem Entwurf: `confirm()`-Hinweis, dass der Entwurf überschrieben wird. Beim Start eines neuen Bogens (weder `resumeEntwurf` noch `bogenId`) wird der alte Entwurf per `clearEntwurf()` (mount-Effect) verworfen.
- **Fortsetzen** lädt `bogen` **und** `step` aus dem Entwurf (lazy `useState`-Initializer).
- **Archiv-Bogen öffnen** (`bogenId`): Entwurf-Logik ist ebenfalls aktiv (kein Datenverlust bei Änderungen).
- **Beim Abschluss** (`finalize()`): ausstehenden Auto-Save-Timer abbrechen, `recomputeArtikelProzente` → `saveBogen` → `clearEntwurf`. Verhindert, dass ein pending Debounce den gerade geleerten Entwurf wiederherstellt.

### Teilen / Export – exportXlsx.js
- `exportBogen(bogen)` → Blob bauen + **Download** (bisheriges Verhalten, Dateiname `Inventur_<Nr>_<Datum>.xlsx`).
- `shareBogen(bogen)` → **Web Share API** mit Datei: prüft `navigator.canShare({ files:[file] })`, ruft `navigator.share({ files:[file], title })`. **Fallback = Download**, wenn nicht unterstützt oder bei Fehler; **AbortError** (Nutzer bricht ab) wird nicht als Fehler behandelt.
- ErfassungFlow Schritt 4: zwei Buttons – **„📤 Teilen (WhatsApp)"** (`handleShare`) und **„⬇ Nur herunterladen"** (`handleDownload`). Beide `finalize()`n (Archiv + Entwurf leeren) vor dem Teilen/Download.
- ArchivScreen: pro Bogen zusätzlich ein 📤-Teilen-Button neben dem ⬇-Download.
- **buildWorkbook / Layout NICHT verändern** – Export-Layout muss identisch bleiben.

### Auto-Inventur-Nr. – `naechsteInventurNr(filialeId)`
- Zählt Archiv-Bögen dieser Filiale mit `datum` im **aktuellen Kalenderjahr** und gibt `count + 1` (String) zurück.
- `neuerBogen()` belegt `inventurNr` damit für die erste Filiale vor.
- `handleFiliale()` schlägt beim Filialwechsel eine neue Nr. vor (immer neu setzen ist ok, da bewusster Wechsel). Feld bleibt manuell überschreibbar.

### Filialwechsel (`handleFiliale`)
- `nameMl`, `vorgabe` und `inventurNr` werden **immer aus der neuen Filiale** übernommen – **kein Fallback** auf den alten Wert. Fehlt `mlName`/`zielvorgabe`, bleibt das Feld leer (bewusst auszufüllen).

### Prozent-Berechnung
- **Artikel-Verlust-%** = Artikel-€ / **Betrag** der Warengruppe-€ → Vorzeichen folgt dem Artikel (Verlust = negativ, rot). Zentrale Funktion `recomputeArtikelProzente(bogen)` läuft in **jedem** Export (auch aus dem Archiv) sowie beim Abschluss.
- Kopf: „Schlechter als Zielvorgabe" = Differenz `Inventurergebnis − Inventurvorgabe` (rot wenn negativ). Deutsches Komma bei Eingaben erlaubt (`num`/`parseNum`).

### SignedInput (±)
- `defaultNegative` → leeres Feld ist als „−" vorgewählt, erste Eingabe wird negativ (Inventurergebnis, Verlust €/%). `onMouseDown preventDefault`, damit der ±-Button die Tastatur nicht schließt.

## Häufige Fehler & Fixes
| Fehler | Ursache | Fix |
|--------|---------|-----|
| Prozente ×100 in Docs@Work | `%` im Zahlenformat | Prozente als Text schreiben (`fmtProzentStr`) |
| Eingaben nach App-Wechsel weg | nur bei Export gespeichert | Auto-Save `im_entwurf` (debounced) |
| ML-Name/Vorgabe bleibt bei Filialwechsel | Fallback auf alten Wert | immer aus neuer Filiale übernehmen |
| Entwurf taucht nach Export wieder auf | pending Debounce nach `clearEntwurf` | Timer in `finalize()` abbrechen |

## Build / Deploy
```bash
npm install
npm run dev      # lokal
npm run build    # muss fehlerfrei durchlaufen
```
Push auf `main` → Vercel deployt automatisch (Build `npm run build`, Output `dist`).
