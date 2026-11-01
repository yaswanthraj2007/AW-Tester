import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

const MAX_TOASTS = 4;
const DURATION_MS = 5000;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type, message) => {
    setToasts((list) => {
      // An identical toast is already on screen, so don't stack duplicates
      if (list.some((t) => t.type === type && t.message === message)) return list;
      nextId.current += 1;
      return [...list, { id: nextId.current, type, message }].slice(-MAX_TOASTS);
    });
  }, []);

  // Start an auto-dismiss timer for every new toast
  useEffect(() => {
    toasts.forEach((t) => {
      if (!timers.current.has(t.id)) {
        timers.current.set(t.id, setTimeout(() => dismiss(t.id), DURATION_MS));
      }
    });
  }, [toasts, dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}