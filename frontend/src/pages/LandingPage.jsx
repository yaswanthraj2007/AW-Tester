import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';

const FEATURES = [
  { badge: '1', title: 'Visual workflow builder', text: 'Add, reorder and edit steps like click, fill, select and assert. No scripting needed.' },
  { badge: '2', title: 'Real browsers', text: 'Run your flows in Chromium, Firefox or WebKit, powered by Playwright.' },
  { badge: '3', title: 'Clear run reports', text: 'See every step with its status, timing, error message and a screenshot when something fails.' },
  { badge: '4', title: 'Quick Test', text: 'Paste a URL for an instant check: load status, title, load time, screenshot and console errors.' },
  { badge: '5', title: 'Secure by design', text: 'Cookie-based sessions, CSRF protection, rate limiting, and a guard that stops tests from reaching internal networks.' },
  { badge: '6', title: 'Admin controls', text: 'Role-based access with an admin panel for managing users and viewing all runs.' },
];

const HOW_IT_WORKS = [
  { n: '1', title: 'Create a workflow', text: 'Enter the page URL and add the steps a real user would take.' },
  { n: '2', title: 'Run it', text: 'FlowTest opens a fresh browser, performs each step and checks your assertions.' },
  { n: '3', title: 'Read the report', text: 'Review pass or fail for every step, with timings and screenshots.' },
];

const EXAMPLE_STEPS = [
  { text: 'Go to the-internet.herokuapp.com/login', time: '412 ms' },
  { text: 'Fill #username', time: '38 ms' },
  { text: 'Fill #password', time: '31 ms' },
  { text: 'Click button[type="submit"]', time: '276 ms' },
  { text: 'Assert #flash contains "You logged into a secure area!"', time: '54 ms' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  const actions = loading ? null : user ? (
    <Link to="/app" className="btn btn-primary">Open dashboard</Link>
  ) : (
    <>
      <Link to="/login" className="btn btn-ghost">Log in</Link>
      <Link to="/signup" className="btn btn-primary">Sign up</Link>
    </>
  );

  return (
    <>
      <header className="l-header">
        <div className="l-container l-header-inner">
          <Link to="/" className="brand">FlowTest</Link>
          <nav className="l-nav" aria-label="Page sections">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <div className="l-actions">{actions}</div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="l-container hero-grid">
            <div>
              <span className="eyebrow">Workflow testing with Playwright</span>
              <h1>Test your website workflows in a real browser.</h1>
              <p className="lead">
                Define a flow once with simple steps, run it whenever you need, and get a clear
                step-by-step report with screenshots every time.
              </p>
              <div className="row row-left">
                {user ? (
                  <Link to="/app" className="btn btn-primary btn-lg">Open dashboard</Link>
                ) : (
                  <>
                    <Link to="/signup" className="btn btn-primary btn-lg">Get started</Link>
                    <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
                  </>
                )}
              </div>
              <p className="muted hero-note">Includes two sample workflows so you can run a test in a minute.</p>
            </div>

            <div className="card report" aria-label="Example run report">
              <div className="report-head">
                <div>
                  <div className="report-title">Login form test</div>
                  <div className="report-meta">Example report</div>
                </div>
                <span className="badge badge-passed">Passed</span>
              </div>
              <ul className="report-steps">
                {EXAMPLE_STEPS.map((s) => (
                  <li key={s.text} className="report-step">
                    <span className="step-dot" aria-hidden="true">✓</span>
                    <span className="step-text">{s.text}</span>
                    <span className="step-time">{s.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="l-section" aria-labelledby="features-title">
          <div className="l-container">
            <h2 id="features-title">Everything you need to test a flow</h2>
            <p className="l-sub">From building the steps to reading the results, in one place.</p>
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <article key={f.title} className="card feature">
                  <div className="feature-badge" aria-hidden="true">{f.badge}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="l-section l-alt" aria-labelledby="how-title">
          <div className="l-container">
            <h2 id="how-title">How it works</h2>
            <p className="l-sub">Three steps from idea to a verified workflow.</p>
            <div className="steps-grid">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.n} className="card how">
                  <div className="how-num" aria-hidden="true">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!user && (
          <section className="l-container" aria-label="Get started">
            <div className="cta-band">
              <h2>Ready to check your first workflow?</h2>
              <p>Create an account and run a sample test in under a minute.</p>
              <Link to="/signup" className="btn btn-light btn-lg">Create your account</Link>
            </div>
          </section>
        )}
      </main>

      <footer className="l-footer">
        <div className="l-container l-footer-inner">
          <span>© {new Date().getFullYear()} FlowTest</span>
          <span>Built with React, Express and Playwright</span>
        </div>
      </footer>
    </>
  );
}