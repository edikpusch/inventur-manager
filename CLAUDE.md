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
    AuswertungScreen.jsx   ← Flop-Ranglisten (WG/Artikel) + Filial-Rangliste
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
- `im_entwurf`  → **Auto-Save** des laufenden Bogens: `{ bogen, view }` (view = Cursor im Wizard)
- `im_artikel_stamm` → Artikelstamm `[{ id, name, warengruppe }]` für die Schnellauswahl
- `im_ursachen_geloescht` → per ✕ ausgeblendete **eingebaute** Ursachen (Array von Namen)

## Wichtige Systeme & Regeln

### Entwurf-System (Auto-Save) – `im_entwurf`
- ErfassungFlow speichert bei **jeder** Änderung an `bogen`/`step` **debounced (500 ms)** via `saveEntwurf(bogen, step)` (useEffect auf `[bogen, step]`, erster Lauf wird übersprungen, Timer in `saveTimer`-Ref).
- **HomeScreen** zeigt bei vorhandenem Entwurf eine Karte „Entwurf fortsetzen" (Filiale · Datum · Schritt x/4) mit **Fortsetzen** (`go('erfassung', { resumeEntwurf: true })`) und **Verwerfen** (`confirm()` → `clearEntwurf()`).
- **Neuer Bogen** bei vorhandenem Entwurf: `confirm()`-Hinweis, dass der Entwurf überschrieben wird. Beim Start eines neuen Bogens (weder `resumeEntwurf` noch `bogenId`) wird der alte Entwurf per `clearEntwurf()` (mount-Effect) verworfen.
- **Fortsetzen** lädt `bogen` **und** `step` aus dem Entwurf (lazy `useState`-Initializer).
- **Archiv-Bogen öffnen** (`bogenId`): Entwurf-Logik ist ebenfalls aktiv (kein Datenverlust bei Änderungen).
- **Beim Abschluss** (`finalize()`): ausstehenden Auto-Save-Timer abbrechen, `recomputeArtikelProzente` → `saveBogen` → `clearEntwurf`. Verhindert, dass ein pending Debounce den gerade geleerten Entwurf wiederherstellt.

### Ursachen-Auswahl (im Wizard)
- **Suchfeld** filtert alle Ursachen; ohne Suche sind die **Kategorien eingeklappt** (`offeneKats`).
- Jede Zeile (eingebaut **und** eigene Vorlage) hat ein **✕**: eingebaute landen in
  `im_ursachen_geloescht` (nur ausgeblendet, Daten bleiben in `ursachenListe.js`),
  eigene werden per `deleteVorlage` entfernt. **Ohne Rückfrage** – Wiederherstellen
  in Einstellungen → „Gelöschte Ursachen".
- **Eigene Ursache** nur zusammen mit **eigener Maßnahme**: ein Formular mit beiden
  Feldern, Button erst aktiv wenn beides gefüllt → `saveVorlage({ursache, massnahme})`
  und Übernahme in den Eintrag.

### Artikelstamm
- Jeder erfasste Artikel wird **automatisch** gemerkt (`saveArtikelStamm`, Name = Schlüssel,
  case-insensitiv, Warengruppe wird aktualisiert). Sync beim Betreten von `artHub` und in `finalize()`.
- Artikel-Screen: der Name-Input ist gleichzeitig **Suchfeld**; Treffer als Karten.
  Tap übernimmt Namen **und** – falls die Warengruppe im aktuellen Bogen existiert –
  setzt `warengruppeId` und springt direkt zum Verlust-Screen (Schritt 2).
- Verwaltung/Löschen in Einstellungen.

### Zifferntastatur
- Zahlen-Screens fokussieren ihr Feld automatisch (`autoFocus`; `SignedInput` hat eine
  eigene `autoFocus`-Prop mit `useEffect`-Fokus). Zusammen mit `inputMode` öffnet Android
  direkt den Ziffernblock.

### Home-Button (permanent)
- 🏠 rechts in der Kopfzeile auf **allen** Screens (Erfassung, Archiv, Einstellungen, Auswertung).
- Im Wizard `goHome()`: bricht den laufenden Auto-Save-Timer ab und speichert den Entwurf
  **sofort** (Erfassung „pausiert"), dann `go('home')`. Fortsetzen über die bestehende Karte.
- `hatInhalt(bogen)` verhindert leere Entwürfe: ohne Ergebnis und ohne gefüllte
  Warengruppen/Artikel wird `clearEntwurf()` statt `saveEntwurf()` aufgerufen –
  sonst erschiene nach jedem Abbruch eine sinnlose „Entwurf fortsetzen"-Karte.

### Auswertung (AuswertungScreen.jsx)
- Datenquelle: **alle** Bögen aus `im_archiv` (kein Zeitfilter).
- Bereich umschaltbar: **Bezirk (alle Filialen)** ↔ einzelne Filiale (`filialeId`, Fallback `filialeNummer`).
- Kennzahl umschaltbar: **Summe €** (Standard) · **Ø %** · **Anzahl Nennungen**.
- `aggregiere(boegen, listenKey, nameFeld)` fasst Warengruppen bzw. Artikel über alle
  Bögen nach **Name (case-insensitiv)** zusammen; bei Artikeln wird die Warengruppe aus
  demselben Bogen (`warengruppeId`) mitgeführt.
- `sortiere()`: größter Verlust zuerst (€/% aufsteigend, Anzahl absteigend). Nur **Flop**-Listen,
  bewusst keine Top-Liste – erfasst werden ohnehin nur auffällige (verlustreiche) Positionen.
- `filialStatistik()`: Ø Differenz `Ergebnis − Vorgabe` je Filiale (Sortierschlüssel, schlechteste
  zuerst) plus letztes Ergebnis (höchstes `datum`) und Anzahl Inventuren. Nur im Bezirks-Modus.
- Listen auf 20 Einträge begrenzt.

### Teilen / Export – exportXlsx.js
- `exportBogen(bogen)` → Blob bauen + **Download** (bisheriges Verhalten, Dateiname `Inventur_<Nr>_<Datum>.xlsx`).
- `buildDatei(bogen)` → fertiges `File`-Objekt (muss **vorab** gebaut werden, s.u.).
- `teileDateiJetzt(file, {onGeteilt, onAbbruch, onFallback})` → teilt eine **bereits gebaute**
  Datei. Bewusst **nicht `async`**; ruft `navigator.share()` synchron auf und hängt `.then()` an.
- **KERNREGEL:** `navigator.share()` muss **synchron im Klick-Handler** laufen. Schon ein
  einziges `await` davor (z.B. um die Datei erst zu erzeugen) lässt Chrome mit
  **`NotAllowedError: Permission denied`** abbrechen – die Datei landet dann nur im Download.
  Deshalb sind `handleShare` in ErfassungFlow und ArchivScreen **nicht async** und die Datei
  ist immer vorher fertig. Ist sie noch nicht bereit, erscheint ein Hinweis („bitte gleich
  noch einmal tippen") statt eines stillen Downloads.
- Dateityp-Kaskade `teilbareDatei()`: xlsx → `vnd.ms-excel` → `octet-stream`; Dateiname bleibt
  immer `.xlsx`.
- `shareBogen(bogen, prebuilt)` → **Web Share API**; Rückgabe `'geteilt' | 'abgebrochen' | 'download'`.
  **AbortError** (Nutzer bricht ab) → `'abgebrochen'`, **kein** Download. Sonst Fallback = Download.
- **WICHTIG:** `navigator.share()` muss unmittelbar aus der Nutzer-Geste heraus laufen.
  Wird die Datei erst nach dem Antippen gebaut (ExcelJS braucht einen Moment), verfällt die
  Geste und Android blockiert das Teilen (→ stiller Download). Deshalb baut ErfassungFlow
  die Datei im Abschluss-Screen vorab in `dateiRef` (debounced, invalidiert bei Änderungen)
  und übergibt sie an `shareBogen`. Zusätzlich startet `onPointerDown` die Erzeugung als
  Vorlauf (`dateiPromise`), falls der Vorab-Build noch nicht durch ist.
- **ArchivScreen** hat dieselbe Vorbereitung: `onPointerDown` → `vorbereiten(b)` legt die
  Datei in `dateien.current[b.id]` ab, `onClick` teilt sie. Ohne das erschien statt des
  Teilen-Fensters der Download-Dialog.
- `canShare` wird nur geprüft, wenn es existiert – fehlt die Funktion, wird das Teilen
  trotzdem versucht (statt sofort auf Download zu gehen).
- Endet das Teilen im Download-Fallback, bekommt der Nutzer einen Hinweis – vorher wurde
  still heruntergeladen, was wie ein Fehler aussah.
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
| „Teilen" lädt nur herunter (`NotAllowedError: Permission denied`) | `await` vor `navigator.share()` → Chrome wertet die Nutzer-Geste als verbraucht | Datei vorab bauen, `handleShare` **nicht async**, `share()` synchron aufrufen (`teileDateiJetzt`) |
| Abbrechen im Teilen-Dialog löst Download aus | AbortError fiel in den Fallback | bei AbortError früh `'abgebrochen'` zurückgeben |

## Build / Deploy
```bash
npm install
npm run dev      # lokal
npm run build    # muss fehlerfrei durchlaufen
```
Push auf `main` → Vercel deployt automatisch (Build `npm run build`, Output `dist`).
