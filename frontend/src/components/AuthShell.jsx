import { Link } from 'react-router-dom';

export default function AuthShell({ title, subtitle, footer, children }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link to="/" className="brand brand-light">FlowTest</Link>
        <h2>Test every workflow, every time.</h2>
        <ul>
          <li>Build flows from simple steps, no scripting</li>
          <li>Run them in real browsers with Playwright</li>
          <li>Get step-by-step reports with screenshots</li>
        </ul>
      </aside>

      <main className="auth-main">
        <Link to="/" className="brand auth-mobile-brand">FlowTest</Link>
        <div className="card auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          {footer && <p className="muted auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  );
}