// Validates req[source] against a zod schema. Parsed, cleaned data is placed
// on req.validated[source]. Controllers must use that, never the raw req.body.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  req.validated = { ...(req.validated || {}), [source]: result.data };
  next();
};