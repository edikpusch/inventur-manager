// Zahlen-Eingabe mit Vorzeichen-Umschalter (±).
// Auf dem Android-Ziffernblock fehlt das Minus – mit dem Button lässt sich
// das Vorzeichen umschalten. Ohne Minus = positiv.
export default function SignedInput({ value, onChange, placeholder, inputMode = 'decimal' }) {
  const str = String(value ?? '')
  const isNeg = str.trim().startsWith('-')

  const toggleSign = () => {
    const s = str.trim()
    if (s === '' || s === '-') {
      onChange(s === '-' ? '' : '-')
      return
    }
    onChange(isNeg ? s.replace(/^-/, '') : '-' + s)
  }

  return (
    <div className="signed">
      <button
        type="button"
        className={`sign-btn ${isNeg ? 'neg' : 'pos'}`}
        onClick={toggleSign}
        aria-label="Vorzeichen umschalten"
      >
        {isNeg ? '−' : '+'}
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </div>
  )
}
