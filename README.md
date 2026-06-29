# InventurManager

React-PWA für Verkaufsleiter zur Erstellung von **Inventur-Bearbeitungsbögen** und Export als `.xlsx`.

## Stack
- React + Vite
- ExcelJS (xlsx-Export, alle Werte in JS vorberechnet – keine Excel-Formeln)
- localStorage (kein Backend)

## Workflow
Bogen erfassen → als `.xlsx` exportieren → per WhatsApp ans iPad → Docs@Work → Firmen-Mail an Betriebsrat.

## Entwicklung
```bash
npm install
npm run dev      # lokal
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal testen
```

## Deployment (Vercel)
- Build Command: `npm run build`
- Output Directory: `dist`
- Auto-Deploy bei Push auf `main`.

## Projektstruktur
```
src/
  components/
    HomeScreen.jsx
    EinstellungenScreen.jsx
    ErfassungFlow.jsx      ← 4 Schritte als Sub-States
    EintragForm.jsx        ← Warengruppen-/Artikel-Eintrag
    ArchivScreen.jsx
  data/ursachenListe.js    ← Ursachen + Maßnahmen
  utils/exportXlsx.js      ← ExcelJS-Export
  store.js                 ← localStorage
  App.jsx                  ← State-Router
  main.jsx
public/
  manifest.json, sw.js, icons
```

## localStorage Keys
- `im_profil` → `{ vlName, filialen: [{ id, nummer, mlName }] }`
- `im_archiv` → Array gespeicherter Bögen
