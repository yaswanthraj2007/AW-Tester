import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="center-page">
      <h1>403</h1>
      <p className="muted">You do not have permission to view this page.</p>
      <Link to="/app" className="btn btn-primary">Back to the app</Link>
    </div>
  );
}