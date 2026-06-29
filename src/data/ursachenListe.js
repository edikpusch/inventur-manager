// Ursachen & vorgeschlagene Maßnahmen für die Inventur-Analyse.
// Jede Ursache hat eine Kategorie, den Ursachentext und die vorausgefüllte Maßnahme.
export const URSACHEN_LISTE = [
  // A) System / Belege / Abgrenzung
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Aufnahme-/Zählfehler', massnahme: 'Nachkontrolle zukünftig gewissenhaft durchführen' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Abgrenzungsfehler', massnahme: 'Abgrenzung von Lieferscheinen und Nachbuchungen am Inventur- und Folgetag prüfen' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Vorinventur unplausibel', massnahme: 'Warengruppenentwicklung und Vorbestand gemeinsam prüfen' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Offene Belege', massnahme: 'Offene Belege zeitnah klären und Umlagerungen in der Inventurwoche vermeiden' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Filialkonto nicht bearbeitet', massnahme: 'Filialkonto vollständig nachpflegen / wöchentliche Bearbeitung nachhalten' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Plausiliste Dienstleiter auffällig', massnahme: 'Plausiliste prüfen / Abweichungen vollständig bereinigen' },
  { kategorie: 'A) System / Belege / Abgrenzung', ursache: 'Fehlende Gutschriften / Entlastungen', massnahme: 'Gutschriften im Filialkonto prüfen / Nachträgliche Buchungen prüfen' },

  // B) Wareneingang / Retouren
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Wareneingangskontrolle unzureichend', massnahme: 'Vorgeschriebene Mengen- und Sichtkontrolle bei Anlieferung sicherstellen' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Ware frei zugänglich (Frühanlieferungszone / Rampe)', massnahme: 'Waren und Leergut dauerhaft aus diesen Bereichen entfernen' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Lager unübersichtlich', massnahme: 'Lager bereinigen und feste Lagerstruktur definieren' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Überbestände nicht aktiv umgelagert', massnahme: 'Aktiv prüfen, wohin MHD-Ware umgelagert werden kann' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Non-Food Retouren nicht korrekt durchgeführt', massnahme: 'Verantwortlichen festlegen / Umsetzung verbindlich überwachen' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Fehlerhafte TMBS-Dokumentation von Retouren', massnahme: 'Verantwortlichen festlegen / Umsetzung verbindlich überwachen' },
  { kategorie: 'B) Wareneingang / Retouren', ursache: 'Zeitungsremissionen nicht nach Vorgabe', massnahme: 'Verantwortlichen festlegen / verbindliche Routine einführen' },

  // C) Zugriffssicherung
  { kategorie: 'C) Zugriffssicherung', ursache: 'Zigarettenträger offen', massnahme: 'Bei nicht besetzter Kasse verschlossen halten / regelmäßig prüfen' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'Kundenzugriff E-Zigaretten-, Tabak-, Spirituosenschrank', massnahme: 'Herausgabe ausschließlich über Mitarbeiter sicherstellen' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'Hochwertige Artikel frei zugänglich', massnahme: 'Platzierung in Kassennähe / gesicherte Ausgabe über das Büro' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'Hochwertige Artikel kommen abhanden', massnahme: 'EAS auch ergänzend zur Vorgabe auf filialindividuellen Verlustartikeln anbringen' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'EAS Signal wird von Kassenkräften ignoriert', massnahme: 'Korrekte Kassenreaktion besprechen / nachhalten' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'EAS außer Funktion', massnahme: 'Funktionsfähigkeit herstellen / regelmäßige Funktionskontrolle durchführen' },
  { kategorie: 'C) Zugriffssicherung', ursache: 'Risiko durch SCO- & Hybrid-Kassen', massnahme: 'Kassenkräfte sensibilisieren / Stichprobenkontrollen durchführen' },

  // D) Externer & interner Diebstahl
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Externer Diebstahl', massnahme: 'Platzierung anpassen / Mengen im Verkauf reduzieren / EAS einsetzen' },
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Interner Diebstahl', massnahme: 'Sensibilisierungsgespräch führen / Zugriff einschränken / Kontrollen verbindlich durchführen' },
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Personaleinkauf', massnahme: 'Einhaltung konsequent einfordern / intensiv prüfen / Verstöße konsequent ahnden / Taschenkontrollen' },
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Begünstigungskäufe', massnahme: 'Kassenabläufe gezielt beobachten / bei Auffälligkeiten Bonkontrollen durchführen' },
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Warenretouren / Leergut auffällig', massnahme: 'Kassenbelege bei der Abrechnung prüfen / Warenrücknahmen nachvollziehen' },
  { kategorie: 'D) Externer & interner Diebstahl', ursache: 'Auffällige Stornierungen / manuelle Autorisierungen', massnahme: 'Auffällige Mitarbeiter kontrollieren / Einsatz anpassen / bei Bedarf nachschulen' },

  // E) Bestandsteuerung / Dispo
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'AutoDispo-Bestände falsch', massnahme: 'Bestände prüfen / korrigieren' },
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'Min-/Max-Werte unpassend', massnahme: 'Min/Max-Werte an Abverkauf und Regalkapazität ausrichten' },
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'Langsamdreher zu breit platziert', massnahme: 'Schmaler platzieren / Min/Max-Werte anpassen' },
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'Überbestände', massnahme: 'Umlagerungen ans Lager oder andere Filialen prüfen' },
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'Fehlerhafte manuelle Bestelleingriffe', massnahme: 'Bestellroutine prüfen, Verantwortlichkeit klären' },
  { kategorie: 'E) Bestandsteuerung / Dispo', ursache: 'Zuteilungsmengen unpassend', massnahme: 'Zuteilungsmengen kritisch prüfen / ggf. reduzieren' },

  // F) MHD / Verderb
  { kategorie: 'F) MHD / Verderb', ursache: 'MHD-Kontrollen fehlen', massnahme: 'Bearbeitung der MHD Aufnahmen und Entnahmebestätigungen sowie Wälzpläne nachhalten' },
  { kategorie: 'F) MHD / Verderb', ursache: 'Reduzierungsschema nicht eingehalten', massnahme: 'Regelmäßig prüfen, ob das Reduzierungsschema eingehalten wird / verbindlich anwenden' },
  { kategorie: 'F) MHD / Verderb', ursache: 'Fehlende Warenwälzung', massnahme: 'Feste wöchentliche Prüf-Routine einführen, ob Warenwälzung zuverlässig erfolgt' },
  { kategorie: 'F) MHD / Verderb', ursache: 'Kühlschäden im Inventurzeitraum', massnahme: 'Ursachen beheben / erneute Ausfälle verhindern / wie kann zukünftig Warenschaden vermieden werden?' },

  // G) Kasse
  { kategorie: 'G) Kasse', ursache: 'Fehlerhaftes Kassieren', massnahme: 'Trainingskäufe nachhalten / gezielt nachschulen / konsequent ahnden' },
  { kategorie: 'G) Kasse', ursache: 'Kassendifferenzen unplausibel', massnahme: 'Differenzen auswerten / Fehlverhalten abstellen / Einhaltung kontrollieren' },
  { kategorie: 'G) Kasse', ursache: 'Offene Kassensperren', massnahme: 'Kassensperren an nicht besetzten Kassen durchgehend verschlossen halten' },

  // H) Bake Off
  { kategorie: 'H) Bake Off', ursache: 'Backempfehlung nicht genutzt', massnahme: 'Backmengen strikt nach Empfehlung steuern / regelmäßig abgleichen' },
  { kategorie: 'H) Bake Off', ursache: 'Unqualifiziertes Backen', massnahme: 'Verantwortlichkeit klären / Schulung durchführen' },

  // I) Verkaufsleiter-Kontrollen
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Filial-Besuche i.O.?', massnahme: 'Besuchshäufigkeit auf 3x wöchentlich erhöhen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Frühkontrollen i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Schichtwechselkontrollen i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Spätkontrollen i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Revisions-Durchführung i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der Prüfung Kassenabrechnungen i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
  { kategorie: 'I) Verkaufsleiter-Kontrollen', ursache: 'Regelmäßigkeit der EAS-Kontrollen i.O.?', massnahme: 'Kontrollintervall auf 1x wöchentlich verkürzen bis das Ergebnis stabil ist' },
]

// Hilfsfunktion: Maßnahme zu einer Ursache finden
export function massnahmeFuer(ursache) {
  const found = URSACHEN_LISTE.find((u) => u.ursache === ursache)
  return found ? found.massnahme : ''
}
