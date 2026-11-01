// Forwards errors from async handlers to the error middleware
// (works on both Express 4 and 5)
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);