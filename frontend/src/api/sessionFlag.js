export const FLAG_KEY = 'flowtest_has_session';

export const hasSessionFlag = () => {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

export const setSessionFlag = (on) => {
  try {
    if (on) localStorage.setItem(FLAG_KEY, '1');
    else localStorage.removeItem(FLAG_KEY);
  } catch {
    /* storage unavailable (private mode, blocked): the app still works */
  }
};