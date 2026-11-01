export default function FullPageSpinner() {
  return (
    <div className="center-page" role="status" aria-live="polite">
      <div className="spinner" />
      <span className="muted">Loading...</span>
    </div>
  );
}