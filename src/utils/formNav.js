// Enter / "Weiter"-Taste springt zum nächsten Eingabefeld innerhalb des
// Containers, an dem dieser Handler hängt (onKeyDown={handleEnterNext}).
// Textarea behält Enter für Zeilenumbruch; Datumsfelder bleiben unberührt.
export function handleEnterNext(e) {
  if (e.key !== 'Enter') return
  const t = e.target
  if (!t || t.tagName !== 'INPUT') return
  if (t.type === 'date') return
  e.preventDefault()
  const scope = e.currentTarget
  const fields = Array.from(scope.querySelectorAll('input, select, textarea')).filter(
    (el) => !el.disabled && el.type !== 'hidden' && el.offsetParent !== null
  )
  const idx = fields.indexOf(t)
  for (let j = idx + 1; j < fields.length; j++) {
    if (fields[j].offsetParent !== null) {
      fields[j].focus()
      if (typeof fields[j].select === 'function' && fields[j].tagName === 'INPUT') {
        try {
          fields[j].select()
        } catch {
          /* select nicht auf jedem input-Typ erlaubt */
        }
      }
      return
    }
  }
  t.blur()
}
