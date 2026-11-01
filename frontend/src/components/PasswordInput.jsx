import { useState } from 'react';
import { MAX_PASSWORD_LENGTH } from '../utils/passwordStrength';

export default function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        maxLength={MAX_PASSWORD_LENGTH}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="toggle-visibility"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}