import mongoose from 'mongoose';

const handleCastError = (err) => {
  return { statusCode: 400, message: `Invalid ${err.path}: "${err.value}". Please use a valid ID.` };
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return { statusCode: 400, message: `Validation failed: ${messages.join('. ')}` };
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return { statusCode: 409, message: `A record with ${field} "${value}" already exists.` };
};

const handleJWTError = () => ({
  statusCode: 401,
  message: 'Invalid token. Please login again.',
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Your session has expired. Please login again.',
});

const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('💥 UNHANDLED ERROR:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return sendDevError(err, res);
  }

  let error = { ...err, message: err.message, isOperational: err.isOperational };

  if (err instanceof mongoose.Error.CastError) {
    const { statusCode, message } = handleCastError(err);
    error = { isOperational: true, statusCode, status: 'fail', message };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const { statusCode, message } = handleValidationError(err);
    error = { isOperational: true, statusCode, status: 'fail', message };
  }

  if (err.code === 11000) {
    const { statusCode, message } = handleDuplicateKeyError(err);
    error = { isOperational: true, statusCode, status: 'fail', message };
  }

  if (err.name === 'JsonWebTokenError') {
    const { statusCode, message } = handleJWTError();
    error = { isOperational: true, statusCode, status: 'fail', message };
  }

  if (err.name === 'TokenExpiredError') {
    const { statusCode, message } = handleJWTExpiredError();
    error = { isOperational: true, statusCode, status: 'fail', message };
  }

  sendProdError(error, res);
};

export default errorMiddleware;
