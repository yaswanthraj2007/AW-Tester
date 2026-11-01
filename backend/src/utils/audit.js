// TODO(MySQL): write these to an `audit_log` table
// (id, at, actor_id, action, target_id, details JSON) instead of the console.
// Log ids only, never passwords, tokens, or cookies.
export const audit = (req, action, details = {}) => {
  console.log(
    JSON.stringify({
      type: 'audit',
      at: new Date().toISOString(),
      actor: req.user.id,
      ip: req.ip,
      action,
      ...details,
    })
  );
};
