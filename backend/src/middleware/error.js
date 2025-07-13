// Error handling middleware
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Determine status code
  let status = err.status || err.statusCode || 500;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
  } else if (err.name === 'CastError') {
    status = 400;
  }

  // Prepare error response
  const response = {
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred processing your request' 
      : err.message,
    status: status
  };

  // Add additional info in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  // Send error response
  res.status(status).json(response);
};

module.exports = errorHandler;