// Label + control + hint/error. The caller renders the input and wires
// aria-invalid / aria-describedby to `${id}-error` and `${id}-hint`.
export default function FormField({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small id={`${id}-hint`} className="muted">{hint}</small>}
      {error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}
    </div>
  );
}