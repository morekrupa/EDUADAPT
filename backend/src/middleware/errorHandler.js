// Mount this LAST in server.js, after all app.use() route registrations:
//   app.use(errorHandler);

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }
  if (err.code === 'P2003') {
    return res.status(409).json({ error: 'Cannot complete — related records exist.' });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error.';
  return res.status(status).json({ error: message });
};

module.exports = { errorHandler };
