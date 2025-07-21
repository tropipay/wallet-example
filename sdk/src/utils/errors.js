/**
 * TropiPay SDK Error Classes
 * 
 * This module defines custom error classes used throughout the SDK to provide
 * better error handling and debugging capabilities.
 */

/**
 * Base TropiPay SDK Error
 * 
 * @class TropiPayError
 * @extends Error
 */
class TropiPayError extends Error {
  /**
   * Create a TropiPay error
   * 
   * @param {string} message - Error message
   * @param {string} [code] - Error code
   * @param {Object} [details] - Additional error details
   */
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'TropiPayError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TropiPayError);
    }
  }

  /**
   * Convert error to JSON representation
   * 
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Authentication Error
 * 
 * Thrown when authentication fails or when operations require authentication
 * but the user is not authenticated.
 * 
 * @class AuthenticationError
 * @extends TropiPayError
 */
class AuthenticationError extends TropiPayError {
  /**
   * Create an authentication error
   * 
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'AUTHENTICATION_FAILED', details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation Error
 * 
 * Thrown when input validation fails, such as invalid parameters,
 * missing required fields, or data format errors.
 * 
 * @class ValidationError
 * @extends TropiPayError
 */
class ValidationError extends TropiPayError {
  /**
   * Create a validation error
   * 
   * @param {string} message - Error message
   * @param {Object} [validationErrors] - Specific validation errors
   */
  constructor(message, validationErrors = {}) {
    super(message, 'VALIDATION_FAILED', { validationErrors });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * API Error
 * 
 * Thrown when TropiPay API returns an error response or when
 * there are network-related issues.
 * 
 * @class APIError
 * @extends TropiPayError
 */
class APIError extends TropiPayError {
  /**
   * Create an API error
   * 
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {Object} [response] - API response data
   */
  constructor(message, statusCode = 0, response = {}) {
    super(message, 'API_ERROR', { statusCode, response });
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Network Error
 * 
 * Thrown when there are network connectivity issues, timeouts,
 * or other connection-related problems.
 * 
 * @class NetworkError
 * @extends TropiPayError
 */
class NetworkError extends TropiPayError {
  /**
   * Create a network error
   * 
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   */
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * Rate Limit Error
 * 
 * Thrown when API rate limits are exceeded.
 * 
 * @class RateLimitError
 * @extends TropiPayError
 */
class RateLimitError extends TropiPayError {
  /**
   * Create a rate limit error
   * 
   * @param {string} message - Error message
   * @param {number} [retryAfter] - Seconds to wait before retrying
   */
  constructor(message, retryAfter = 60) {
    super(message, 'RATE_LIMITED', { retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Insufficient Funds Error
 * 
 * Thrown when attempting to transfer more money than available
 * in the account.
 * 
 * @class InsufficientFundsError
 * @extends TropiPayError
 */
class InsufficientFundsError extends TropiPayError {
  /**
   * Create an insufficient funds error
   * 
   * @param {string} message - Error message
   * @param {Object} [details] - Additional details (available balance, requested amount)
   */
  constructor(message, details = {}) {
    super(message, 'INSUFFICIENT_FUNDS', details);
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Account Error
 * 
 * Thrown when there are issues with account operations,
 * such as account not found or account suspended.
 * 
 * @class AccountError
 * @extends TropiPayError
 */
class AccountError extends TropiPayError {
  /**
   * Create an account error
   * 
   * @param {string} message - Error message
   * @param {string} [accountId] - Related account ID
   */
  constructor(message, accountId = null) {
    super(message, 'ACCOUNT_ERROR', { accountId });
    this.name = 'AccountError';
    this.accountId = accountId;
  }
}

/**
 * Transfer Error
 * 
 * Thrown when transfer operations fail due to business logic
 * or processing errors.
 * 
 * @class TransferError
 * @extends TropiPayError
 */
class TransferError extends TropiPayError {
  /**
   * Create a transfer error
   * 
   * @param {string} message - Error message
   * @param {Object} [transferDetails] - Transfer details that failed
   */
  constructor(message, transferDetails = {}) {
    super(message, 'TRANSFER_FAILED', { transferDetails });
    this.name = 'TransferError';
    this.transferDetails = transferDetails;
  }
}

/**
 * Create appropriate error from HTTP response
 * 
 * This utility function converts HTTP responses to appropriate SDK errors.
 * 
 * @param {Object} error - Axios error object
 * @returns {TropiPayError} Appropriate error instance
 * 
 * @example
 * try {
 *   await httpClient.post('/api/endpoint');
 * } catch (error) {
 *   throw createErrorFromResponse(error);
 * }
 */
function createErrorFromResponse(error) {
  if (!error.response) {
    // Network error
    if (error.code === 'ECONNABORTED') {
      return new NetworkError('Request timeout');
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new NetworkError('Connection failed');
    }
    return new NetworkError(error.message);
  }

  const { status, data } = error.response;
  const message = data?.message || error.message || 'Unknown error';

  switch (status) {
    case 400:
      if (data?.code === 'INSUFFICIENT_FUNDS') {
        return new InsufficientFundsError(message, data);
      }
      return new ValidationError(message, data?.errors);
    
    case 401:
      return new AuthenticationError(message);
    
    case 403:
      return new TropiPayError(message, 'FORBIDDEN');
    
    case 404:
      if (message.includes('account')) {
        return new AccountError(message);
      }
      return new TropiPayError(message, 'NOT_FOUND');
    
    case 422:
      return new ValidationError(message, data?.errors);
    
    case 429:
      const retryAfter = error.response.headers['retry-after'] || 60;
      return new RateLimitError(message, parseInt(retryAfter));
    
    case 500:
    case 502:
    case 503:
      return new TropiPayError(message, 'SERVICE_ERROR');
    
    default:
      return new APIError(message, status, data);
  }
}

/**
 * Check if error is retryable
 * 
 * Determines if an error is temporary and the operation can be retried.
 * 
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 * 
 * @example
 * if (isRetryableError(error)) {
 *   // Wait and retry
 *   await delay(1000);
 *   return retry();
 * }
 */
function isRetryableError(error) {
  if (error instanceof NetworkError) {
    return true;
  }
  
  if (error instanceof TropiPayError) {
    return ['SERVICE_ERROR', 'TIMEOUT', 'RATE_LIMITED'].includes(error.code);
  }
  
  return false;
}

/**
 * Get user-friendly error message
 * 
 * Converts technical error messages to user-friendly descriptions.
 * 
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 * 
 * @example
 * const userMessage = getUserFriendlyMessage(error);
 * showNotification(userMessage, 'error');
 */
function getUserFriendlyMessage(error) {
  if (error instanceof AuthenticationError) {
    return 'Please log in to continue';
  }
  
  if (error instanceof InsufficientFundsError) {
    return 'Insufficient funds in your account';
  }
  
  if (error instanceof ValidationError) {
    return 'Please check your input and try again';
  }
  
  if (error instanceof NetworkError) {
    return 'Connection error. Please check your internet connection';
  }
  
  if (error instanceof RateLimitError) {
    return 'Too many requests. Please wait a moment and try again';
  }
  
  if (error instanceof TransferError) {
    return 'Transfer failed. Please try again or contact support';
  }
  
  return error.message || 'An unexpected error occurred';
}

module.exports = {
  TropiPayError,
  AuthenticationError,
  ValidationError,
  APIError,
  NetworkError,
  RateLimitError,
  InsufficientFundsError,
  AccountError,
  TransferError,
  createErrorFromResponse,
  isRetryableError,
  getUserFriendlyMessage
};