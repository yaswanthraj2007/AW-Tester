import { evaluatePassword } from '../utils/passwordStrength';

const LEVELS = {
  empty: { filled: 0, label: '' },
  weak: { filled: 1, label: 'Weak' },
  fair: { filled: 2, label: 'Fair' },
  good: { filled: 3, label: 'Good' },
  strong: { filled: 4, label: 'Strong' },
};

export default function PasswordStrength({ password }) {
  const { checks, common, level } = evaluatePassword(password);
  const { filled, label } = LEVELS[level];

  return (
    <div className="strength">
      <div className="strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= filled ? `bar bar-${level}` : 'bar'} />
        ))}
      </div>

      <p className="strength-label" aria-live="polite">
        {password ? `Password strength: ${label}${common ? ' (too common)' : ''}` : 'Choose a strong password'}
      </p>

      <ul className="checklist">
        {checks.map((c) => (
          <li key={c.id} className={c.met ? 'met' : ''}>
            <span aria-hidden="true">{c.met ? '✓' : '○'}</span> {c.label}
            <span className="sr-only">{c.met ? ' (done)' : ' (needed)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}