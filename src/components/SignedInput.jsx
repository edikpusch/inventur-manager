import { useRef } from 'react'

// Zahlen-Eingabe mit Vorzeichen-Umschalter (±).
// Auf dem Android-Ziffernblock fehlt das Minus – mit dem Button lässt sich
// das Vorzeichen umschalten. Ohne Minus = positiv.
export default function SignedInput({
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
  enterKeyHint = 'next',
}) {
  const inputRef = useRef(null)
  const str = String(value ?? '')
  const isNeg = str.trim().startsWith('-')

  const toggleSign = () => {
    const s = str.trim()
    if (s === '' || s === '-') {
      onChange(s === '-' ? '' : '-')
    } else {
      onChange(isNeg ? s.replace(/^-/, '') : '-' + s)
    }
    // Fokus zurück ins Feld, damit die Tastatur offen bleibt
    if (inputRef.current) inputRef.current.focus()
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
      />
    </div>
  )
}
