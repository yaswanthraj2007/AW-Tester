import { useEffect, useState } from 'react';
import useAuth from '../context/useAuth';
import { api, getErrorMessages } from '../api/client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/workflows')
      .then(({ data }) => {
        if (!cancelled) setWorkflows(data.workflows);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessages(err)[0]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {user.email} ({user.role})</p>

      {error && <div className="alert-error" role="alert">{error}</div>}
      {!error && !workflows && <p className="muted">Loading workflows...</p>}
      {workflows && (
        <>
          <h2>Your workflows ({workflows.length})</h2>
          <ul>
            {workflows.map((w) => <li key={w.id}>{w.name}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}