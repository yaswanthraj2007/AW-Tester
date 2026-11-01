// Keep in sync with the starter list in backend/src/utils/password.js.
// The server is the authority, so this list only gives faster feedback.
const COMMON = new Set([
  'password', 'password1', 'password123', '1234567890', '123456789',
  'qwertyuiop', 'qwerty123', 'iloveyou12', 'admin12345', 'welcome123',
  'letmein123', 'abc1234567', 'changeme123', 'p@ssw0rd123',
]);

export const MAX_PASSWORD_LENGTH = 128;

export const evaluatePassword = (password) => {
  const checks = [
    { id: 'length', label: 'At least 10 characters', met: password.length >= 10 },
    { id: 'lower', label: 'A lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'An uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'A number', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'A symbol (like ! or #)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const common = COMMON.has(password.toLowerCase());
  const metCount = checks.filter((c) => c.met).length;
  const valid = metCount === checks.length && !common && password.length <= MAX_PASSWORD_LENGTH;

  let level = 'empty';
  if (password.length > 0) {
    if (common || metCount <= 2) level = 'weak';
    else if (metCount < checks.length) level = 'fair';
    else level = password.length >= 14 ? 'strong' : 'good';
  }

  return { checks, common, valid, level };
};