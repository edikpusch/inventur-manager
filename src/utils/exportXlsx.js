import ExcelJS from 'exceljs'

// Alle Werte werden in JS vorberechnet – KEINE Excel-Formeln,
// da Docs@Work auf dem iPad keine Formeln berechnet.

const THIN = { style: 'thin', color: { argb: 'FF000000' } }
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN }
const YELLOW = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
const GREY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }

// Spaltenanzahl der Tabellen (A–I)
const COLS = 9

function fmtProzent(n) {
  const v = Number(n)
  if (!isFinite(v)) return ''
  return v
}

function checksToText(checks, frei) {
  const parts = []
  if (checks) {
    if (checks.ML) parts.push('ML')
    if (checks.MLV) parts.push('MLV')
    if (checks.VL) parts.push('VL')
  }
  if (frei && frei.trim()) parts.push(frei.trim())
  return parts.join(', ')
}

function ioToText(io) {
  if (io === 'ja') return 'i.O.'
  if (io === 'nein') return 'nicht i.O.'
  return ''
}

function fmtDatumDE(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

// Setzt Rahmen auf den gesamten Bereich A{row}:I{row}
function borderRow(ws, row) {
  for (let c = 1; c <= COLS; c++) {
    ws.getCell(row, c).border = BORDER_ALL
  }
}

// Baut die Workbook-Instanz auf (ohne Browser-spezifischen Download).
// Dadurch ist die Excel-Logik auch in Node testbar.
export function buildWorkbook(bogen) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'InventurManager'
  wb.created = new Date()
  const ws = wb.addWorksheet('Bearbeitungsbogen', {
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' },
  })

  // Spaltenbreiten
  ws.columns = [
    { width: 20 }, // A Warengruppe/Artikel
    { width: 14 }, // B Verlust €
    { width: 12 }, // C Verlust %
    { width: 42 }, // D Was läuft falsch
    { width: 42 }, // E Was wird geändert
    { width: 18 }, // F Umsetzung
    { width: 18 }, // G Kontrolle
    { width: 16 }, // H Datum Nachkontrolle
    { width: 10 }, // I I.O.?
  ]

  let r = 1

  // --- Titel ---
  ws.mergeCells(r, 1, r, COLS)
  const titleCell = ws.getCell(r, 1)
  titleCell.value = 'Inventur-Bearbeitungsbogen'
  titleCell.font = { bold: true, size: 15 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 24
  r++

  // --- Kopfdaten ---
  const schlechter = Number(bogen.ergebnis) < Number(bogen.vorgabe)

  const headRows = [
    [
      ['Filiale', bogen.filialeNummer],
      ['Datum', fmtDatumDE(bogen.datum)],
      ['Inventur-Nr. im laufenden Jahr', bogen.inventurNr],
      ['Inventurergebnis in %', fmtProzent(bogen.ergebnis), 'pct'],
      ['Schlechter als Zielvorgabe', schlechter ? 'Ja' : 'Nein'],
    ],
    [
      ['EAS-Anlage vorhanden', bogen.eas ? 'ja' : 'nein'],
      ['Kamera-Konzept vorhanden', bogen.kamera ? 'ja' : 'nein'],
      ['Personaldelikte im Zeitraum', bogen.personaldelikte],
      ['Inventurvorgabe in %', fmtProzent(bogen.vorgabe), 'pct'],
      ['Kühlschäden TS/TK', Number(bogen.kuehlschaeden) || 0, 'eur'],
    ],
  ]

  for (const pairs of headRows) {
    // 5 Paare = 10 Zellen, passt genau in A–J? Wir haben 9 Spalten.
    // Lösung: letzte (Wert) Zelle teilt sich Spalte I, Label in H – wir
    // legen die Paare auf feste Spaltenpositionen.
    const positions = [1, 3, 5, 7, 9] // Label-Startspalten
    pairs.forEach((pair, i) => {
      const [label, value, kind] = pair
      const col = positions[i]
      const labelCell = ws.getCell(r, col)
      labelCell.value = label
      labelCell.font = { bold: true, size: 9 }
      labelCell.alignment = { vertical: 'middle', wrapText: true }
      labelCell.fill = GREY
      labelCell.border = BORDER_ALL

      const valCol = col + 1 > COLS ? COLS : col + 1
      const valCell = ws.getCell(r, valCol === col ? col : valCol)
      // Für die letzte Spalte (col=9) gibt es keine eigene Wertspalte –
      // dann Label und Wert kombinieren.
      if (col === COLS) {
        labelCell.value = `${label}: ${value}`
      } else {
        valCell.value = value
        valCell.alignment = { vertical: 'middle' }
        valCell.border = BORDER_ALL
        if (kind === 'pct') valCell.numFmt = '0.00"%"'
        if (kind === 'eur') valCell.numFmt = '#,##0.00 "€"'
      }
    })
    ws.getRow(r).height = 22
    r++
  }

  // Hinweis "Schlechter als Zielvorgabe" farbig hervorheben falls zutreffend
  if (schlechter) {
    const c = ws.getCell(r - 2, 9)
    c.font = { bold: true, color: { argb: 'FFD1242F' }, size: 9 }
  }

  r++ // Leerzeile

  // --- Grundsätze / Leitfaden Infoblock ---
  const grundsaetze =
    'Grundsätze zur Maßnahmenfestlegung:\n' +
    'I. Maßnahmen werden gemeinsam durch VL & ML festgelegt.\n' +
    'II. Es werden nur Maßnahmen im eigenen Verantwortungsbereich definiert.\n' +
    'III. Besser wenige Maßnahmen festlegen, diese jedoch konsequent umsetzen.'
  ws.mergeCells(r, 1, r, 4)
  const gCell = ws.getCell(r, 1)
  gCell.value = grundsaetze
  gCell.font = { size: 8 }
  gCell.alignment = { wrapText: true, vertical: 'top' }
  gCell.border = BORDER_ALL

  const leitfaden =
    'Bearbeitungsleitfaden:\n' +
    'I. VL & ML führen die Inventuranalyse auf Basis der vorläufigen Warengruppeninventur und dem Bericht Inventurranking durch.\n' +
    'II. Sollte das Ergebnis schlechter als die Zielvorgabe ausfallen, wird dieser Bogen binnen 14 Tagen per Mail an RVL gesendet.\n' +
    'III. Dieser Bogen wird zusammen mit der Warengruppen-Inventur und dem Bericht Inventurranking im Ordner 3 abgelegt.'
  ws.mergeCells(r, 5, r, COLS)
  const lCell = ws.getCell(r, 5)
  lCell.value = leitfaden
  lCell.font = { size: 8 }
  lCell.alignment = { wrapText: true, vertical: 'top' }
  lCell.border = BORDER_ALL
  ws.getRow(r).height = 64
  r++
  r++ // Leerzeile

  const tableHeaders = (firstLabel) => [
    firstLabel,
    'Verlust in €',
    'Verlust in %',
    'Was läuft hier konkret falsch, dass dieser Verlust entsteht?',
    'Was wird ab morgen konkret & sichtbar geändert?',
    'Umsetzung durch:',
    'Kontrolle durch:',
    'Datum Nachkontrolle:',
    'Nachkontrolle i.O.?',
  ]

  // --- Hilfsfunktion: Sektion schreiben ---
  function writeSection(sectionTitle, firstLabel, eintraege, firstKeyName) {
    // Sektions-Überschrift
    ws.mergeCells(r, 1, r, COLS)
    const sc = ws.getCell(r, 1)
    sc.value = sectionTitle
    sc.font = { bold: true, size: 11 }
    sc.alignment = { horizontal: 'center', vertical: 'middle' }
    sc.fill = GREY
    borderRow(ws, r)
    ws.getRow(r).height = 20
    r++

    // Header-Zeile (gelb, fett)
    const headers = tableHeaders(firstLabel)
    headers.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1)
      cell.value = h
      cell.font = { bold: true, size: 9 }
      cell.fill = YELLOW
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
      cell.border = BORDER_ALL
    })
    ws.getRow(r).height = 40
    r++

    // Datenzeilen
    eintraege.forEach((e) => {
      const row = [
        e[firstKeyName] ?? '',
        Number(e.verlustEuro),
        Number(e.verlustProzent),
        e.ursache || '',
        e.massnahme || '',
        checksToText(e.umsetzungChecks, e.umsetzungFrei),
        checksToText(e.kontrolleChecks, e.kontrolleFrei),
        fmtDatumDE(e.datumNachkontrolle),
        ioToText(e.io),
      ]
      row.forEach((val, i) => {
        const cell = ws.getCell(r, i + 1)
        cell.value = val
        cell.alignment = { wrapText: true, vertical: 'top' }
        cell.font = { size: 9 }
        cell.border = BORDER_ALL
        if (i === 1) {
          cell.numFmt = '#,##0.00 "€"'
          if (Number(e.verlustEuro) < 0) cell.font = { size: 9, color: { argb: 'FFD1242F' } }
        }
        if (i === 2) {
          cell.numFmt = '0.00"%"'
          if (Number(e.verlustProzent) < 0) cell.font = { size: 9, color: { argb: 'FFD1242F' } }
        }
      })
      ws.getRow(r).height = 34
      r++
    })

    r++ // Leerzeile nach Sektion
  }

  writeSection(
    '1. Analyse der auffälligsten Warengruppen (gemäß Warengruppeninventur)',
    'Warengruppe',
    bogen.warengruppen || [],
    'warengruppe'
  )

  writeSection(
    '2. Analyse der auffälligsten Artikel (gemäß Bericht Inventurranking)',
    'Artikel',
    bogen.artikel || [],
    'artikelName'
  )

  // --- Unterschriften ---
  r++
  const sigRows = [
    ['Name ML:', bogen.nameMl || '', 'Unterschrift ML:', '________________________'],
    ['Name VL:', bogen.nameVl || '', 'Unterschrift VL:', '________________________'],
  ]
  sigRows.forEach((sr) => {
    ws.getCell(r, 1).value = sr[0]
    ws.getCell(r, 1).font = { bold: true, size: 10 }
    ws.mergeCells(r, 2, r, 4)
    ws.getCell(r, 2).value = sr[1]
    ws.getCell(r, 2).font = { size: 10 }
    ws.getCell(r, 2).border = { bottom: THIN }
    ws.getCell(r, 6).value = sr[2]
    ws.getCell(r, 6).font = { bold: true, size: 10 }
    ws.mergeCells(r, 7, r, COLS)
    ws.getCell(r, 7).value = sr[3]
    ws.getCell(r, 7).font = { size: 10 }
    ws.getRow(r).height = 24
    r++
  })

  return wb
}

export async function exportBogen(bogen) {
  const wb = buildWorkbook(bogen)

  // --- Download ---
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Inventur_${bogen.filialeNummer || 'Filiale'}_${bogen.datum || ''}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
