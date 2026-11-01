import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { getErrorMessages, getFieldErrors } from '../api/client';
import AuthShell from '../components/AuthShell';
import FormField from '../components/FormField';
import PasswordInput from '../components/PasswordInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setFieldErrors(next);
    setErrors([]);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      // PublicOnlyRoute redirects into the app once the user is set
    } catch (err) {
      const fe = getFieldErrors(err);
      if (Object.keys(fe).length > 0) setFieldErrors(fe);
      else setErrors(getErrorMessages(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Sign in to run your workflows."
      footer={<>No account yet? <Link to="/signup">Create one</Link></>}
    >
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {errors.length > 0 && (
          <div className="alert-error" role="alert">
            {errors.map((m) => <p key={m}>{m}</p>)}
          </div>
        )}

        <FormField id="login-email" label="Email" error={fieldErrors.email}>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          />
        </FormField>

        <FormField id="login-password" label="Password" error={fieldErrors.password}>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            invalid={Boolean(fieldErrors.password)}
            describedBy={fieldErrors.password ? 'login-password-error' : undefined}
          />
        </FormField>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}