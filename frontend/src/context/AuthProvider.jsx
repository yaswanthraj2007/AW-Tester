import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
import { authApi } from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { FLAG_KEY, hasSessionFlag, setSessionFlag } from '../api/sessionFlag';
import useToast from './useToast';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const clearSession = useCallback(() => {
    setUser(null);
    setSessionFlag(false);
  }, []);

  // The Axios client calls this when a session can no longer be refreshed
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
      toast.info('Your session has expired. Please log in again.');
    });
    return () => setSessionExpiredHandler(null);
  }, [clearSession, toast]);

  // On first load, ask the server who we are (only if a session probably exists)
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!hasSessionFlag()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        if (!cancelled) setUser(data.user);
      } catch (err) {
        if (!cancelled && err.response) clearSession(); // server said no. A network error keeps the flag.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Log out in this tab when another tab logs out
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FLAG_KEY && e.newValue === null) setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    setSessionFlag(true);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email, password) => {
    const { data } = await authApi.signup(email, password);
    setSessionFlag(true);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* clear local state even if the request failed */
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, signup, logout }),
    [user, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}