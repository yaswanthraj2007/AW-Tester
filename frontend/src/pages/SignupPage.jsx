import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { getErrorMessages, getFieldErrors } from '../api/client';
import { evaluatePassword } from '../utils/passwordStrength';
import AuthShell from '../components/AuthShell';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { signup } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Quick checks for fast feedback. The server validates everything again.
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!evaluatePassword(password).valid) next.password = 'Your password does not meet all the requirements below.';
    if (confirm !== password) next.confirm = 'The passwords do not match.';
    setFieldErrors(next);
    setErrors([]);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signup(email.trim(), password);
      toast.success('Account created. Two sample workflows are ready for you.');
    } catch (err) {
      const fe = getFieldErrors(err);
      if (Object.keys(fe).length > 0) setFieldErrors(fe);
      else setErrors(getErrorMessages(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building and running workflow tests."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {errors.length > 0 && (
          <div className="alert-error" role="alert">
            {errors.map((m) => <p key={m}>{m}</p>)}
          </div>
        )}

        <FormField id="signup-email" label="Email" error={fieldErrors.email}>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
          />
        </FormField>

        <FormField id="signup-password" label="Password" error={fieldErrors.password}>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            describedBy={fieldErrors.password ? 'signup-password-error' : undefined}
          />
        </FormField>

        <PasswordStrength password={password} />

        <FormField id="signup-confirm" label="Confirm password" error={fieldErrors.confirm}>
          <PasswordInput
            id="signup-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.confirm)}
            describedBy={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
          />
        </FormField>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </AuthShell>
  );
}