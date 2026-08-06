import { useRef, useEffect } from 'react'

// Zahlen-Eingabe mit Vorzeichen-Umschalter (±).
// Auf dem Android-Ziffernblock fehlt das Minus – mit dem Button lässt sich
// das Vorzeichen umschalten. Ohne Minus = positiv.
//
// defaultNegative=true: leeres Feld ist als "−" vorausgewählt; die erste
// Eingabe wird automatisch negativ. Umschalten auf "+" bleibt möglich.
export default function SignedInput({
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
  enterKeyHint = 'next',
  defaultNegative = false,
  autoFocus = false,
}) {
  const inputRef = useRef(null)

  // Zifferntastatur beim Öffnen des Screens automatisch aufklappen
  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])
  const t = String(value ?? '').trim()
  // Vorzeichen ermitteln: explizit (+/-) hat Vorrang, sonst Default bei leerem Feld
  const isNeg = t.startsWith('-')
    ? true
    : t.startsWith('+')
      ? false
      : t === ''
        ? defaultNegative
        : false

  // Vorzeichen-Präfix für "positiv": nur bei Default-Negativ-Feldern explizit "+",
  // damit die Auswahl "positiv" auch im leeren Feld erhalten bleibt.
  const posPrefix = defaultNegative ? '+' : ''

  const toggleSign = () => {
    const abs = t.replace(/^[-+]/, '')
    const nextNeg = !isNeg
    onChange((nextNeg ? '-' : posPrefix) + abs)
    if (inputRef.current) inputRef.current.focus()
  }

  const handleInput = (rawNew) => {
    const prevEmpty = t === '' || t === '-' || t === '+'
    const nt = rawNew.trim()
    let v = rawNew
    // Erste Eingabe in ein leeres Feld: aktuelles (ggf. Default-)Vorzeichen anwenden
    if (prevEmpty && nt !== '' && !nt.startsWith('-') && !nt.startsWith('+')) {
      v = (isNeg ? '-' : posPrefix) + rawNew
    }
    onChange(v)
  }

  return (
    <div className="signed">
      <button
        type="button"
        className={`sign-btn ${isNeg ? 'neg' : 'pos'}`}
        // verhindert, dass der Button beim Antippen den Fokus (und damit die
        // Tastatur) vom Eingabefeld wegnimmt
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleSign}
        aria-label="Vorzeichen umschalten"
      >
        {isNeg ? '−' : '+'}
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
      />
    </div>
  )
}
