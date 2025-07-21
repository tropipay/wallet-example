/**
 * TropiPay SDK Helper Functions
 * 
 * This module contains utility functions used throughout the SDK for
 * validation, formatting, currency conversion, and other common operations.
 */

const { CURRENCIES, DEFAULTS, ERROR_CODES } = require('./constants');
const { ValidationError } = require('./errors');

/**
 * Validate SDK configuration
 * 
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated configuration with defaults applied
 * @throws {ValidationError} When configuration is invalid
 * 
 * @example
 * const config = validateConfig({
 *   clientId: 'your_client_id',
 *   clientSecret: 'your_secret'
 * });
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('Configuration object is required');
  }

  const { clientId, clientSecret } = config;

  if (!clientId || typeof clientId !== 'string') {
    throw new ValidationError('clientId is required and must be a string');
  }

  if (!clientSecret || typeof clientSecret !== 'string') {
    throw new ValidationError('clientSecret is required and must be a string');
  }

  if (config.environment && !['development', 'production'].includes(config.environment)) {
    throw new ValidationError('environment must be "development" or "production"');
  }

  if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    throw new ValidationError('timeout must be a positive number');
  }

  // Apply defaults
  return {
    ...DEFAULTS,
    ...config,
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim()
  };
}

/**
 * Convert amount from display units to centavos
 * 
 * TropiPay API expects all amounts in centavos (smallest currency unit).
 * This function converts from display units (e.g., dollars) to centavos.
 * 
 * @param {number} amount - Amount in display units
 * @returns {number} Amount in centavos
 * 
 * @example
 * const centavos = convertToCentavos(100.50); // 10050
 * const apiAmount = convertToCentavos(0.01);  // 1
 */
function convertToCentavos(amount) {
  if (typeof amount !== 'number') {
    throw new ValidationError('Amount must be a number');
  }
  
  if (amount < 0) {
    throw new ValidationError('Amount cannot be negative');
  }

  return Math.round(amount * 100);
}

/**
 * Convert amount from centavos to display units
 * 
 * Converts API amounts (centavos) to user-friendly display units.
 * 
 * @param {number} centavos - Amount in centavos
 * @returns {number} Amount in display units
 * 
 * @example
 * const amount = convertFromCentavos(10050); // 100.50
 * const small = convertFromCentavos(1);      // 0.01
 */
function convertFromCentavos(centavos) {
  if (typeof centavos !== 'number') {
    return 0;
  }
  
  return centavos / 100;
}

/**
 * Format currency amount for display
 * 
 * @param {number} amount - Amount to format
 * @param {string} [currency='USD'] - Currency code
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'USD');    // "$1,234.56"
 * formatCurrency(1234.56, 'EUR');    // "€1,234.56"
 * formatCurrency(1234.56, 'CUP');    // "1,234.56 CUP"
 */
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (typeof amount !== 'number') {
    return '0.00';
  }

  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) {
    throw new ValidationError(`Unsupported currency: ${currency}`);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbol = currencyInfo.symbol;
    const formatted = amount.toFixed(currencyInfo.decimals);
    return `${symbol}${formatted}`;
  }
}

/**
 * Validate currency code
 * 
 * @param {string} currency - Currency code to validate
 * @returns {boolean} True if currency is supported
 * 
 * @example
 * isValidCurrency('USD'); // true
 * isValidCurrency('XYZ'); // false
 */
function isValidCurrency(currency) {
  return typeof currency === 'string' && CURRENCIES.hasOwnProperty(currency);
}

/**
 * Validate amount
 * 
 * @param {number} amount - Amount to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.min=0] - Minimum allowed amount
 * @param {number} [options.max] - Maximum allowed amount
 * @returns {boolean} True if amount is valid
 * 
 * @example
 * isValidAmount(100.50);              // true
 * isValidAmount(-10);                 // false
 * isValidAmount(1000, { max: 500 });  // false
 */
function isValidAmount(amount, options = {}) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }

  const { min = 0, max } = options;

  if (amount < min) {
    return false;
  }

  if (max !== undefined && amount > max) {
    return false;
  }

  return true;
}

/**
 * Validate email address
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 * 
 * @example
 * isValidEmail('user@example.com'); // true
 * isValidEmail('invalid-email');    // false
 */
function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic validation)
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number appears valid
 * 
 * @example
 * isValidPhone('+1234567890');   // true
 * isValidPhone('123-456-7890');  // true
 * isValidPhone('invalid');       // false
 */
function isValidPhone(phone) {
  if (typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if we have a reasonable number of digits (7-15)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validate IBAN (International Bank Account Number)
 * 
 * @param {string} iban - IBAN to validate
 * @returns {boolean} True if IBAN format is valid
 * 
 * @example
 * isValidIBAN('ES9121000418450200051332'); // true
 * isValidIBAN('invalid-iban');             // false
 */
function isValidIBAN(iban) {
  if (typeof iban !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Basic format check (2 letters + 2 digits + up to 30 alphanumeric)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
  
  if (!ibanRegex.test(cleanIban)) {
    return false;
  }

  // IBAN length validation by country
  const countryLengths = {
    AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22,
    BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22,
    DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27,
    GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28,
    IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
    LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22,
    MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28,
    PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24, SI: 19,
    SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VG: 24, XK: 20
  };

  const countryCode = cleanIban.substring(0, 2);
  const expectedLength = countryLengths[countryCode];

  return expectedLength && cleanIban.length === expectedLength;
}

/**
 * Validate SWIFT/BIC code
 * 
 * @param {string} swift - SWIFT/BIC code to validate
 * @returns {boolean} True if SWIFT code format is valid
 * 
 * @example
 * isValidSWIFT('BBVAESMMXXX'); // true
 * isValidSWIFT('INVALID');     // false
 */
function isValidSWIFT(swift) {
  if (typeof swift !== 'string') {
    return false;
  }

  const cleanSwift = swift.replace(/\s/g, '').toUpperCase();
  
  // SWIFT code format: 4 letters (bank) + 2 letters (country) + 2 chars (location) + optional 3 chars (branch)
  const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  
  return swiftRegex.test(cleanSwift);
}

/**
 * Generate unique reference ID
 * 
 * @param {string} [prefix='TRP'] - Prefix for the reference
 * @returns {string} Unique reference ID
 * 
 * @example
 * generateReference();           // "TRP-1640995200000-ABC123"
 * generateReference('TRANSFER'); // "TRANSFER-1640995200000-ABC123"
 */
function generateReference(prefix = 'TRP') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sleep for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after delay
 * 
 * @example
 * await sleep(1000); // Wait 1 second
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Retry function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
 * @param {number} [options.maxDelay=10000] - Maximum delay in milliseconds
 * @returns {Promise<any>} Result of function or throws last error
 * 
 * @example
 * const result = await retry(async () => {
 *   return await apiCall();
 * }, { maxRetries: 3, baseDelay: 1000 });
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Deep clone an object
 * 
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 * 
 * @example
 * const original = { a: { b: 1 } };
 * const cloned = deepClone(original);
 * cloned.a.b = 2; // original.a.b remains 1
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }

  return obj;
}

/**
 * Remove sensitive data from objects (for logging)
 * 
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} [sensitiveKeys] - Keys to remove
 * @returns {Object} Sanitized object
 * 
 * @example
 * const sanitized = sanitizeForLogging({
 *   username: 'john',
 *   password: 'secret',
 *   apiKey: 'abc123'
 * });
 * // Result: { username: 'john', password: '[REDACTED]', apiKey: '[REDACTED]' }
 */
function sanitizeForLogging(obj, sensitiveKeys = ['password', 'secret', 'token', 'key', 'authorization']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = deepClone(obj);
  
  function sanitizeRecursive(item, path = '') {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    Object.keys(item).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
        item[key] = '[REDACTED]';
      } else if (typeof item[key] === 'object' && item[key] !== null) {
        sanitizeRecursive(item[key], fullPath);
      }
    });
  }

  sanitizeRecursive(sanitized);
  return sanitized;
}

module.exports = {
  validateConfig,
  convertToCentavos,
  convertFromCentavos,
  formatCurrency,
  isValidCurrency,
  isValidAmount,
  isValidEmail,
  isValidPhone,
  isValidIBAN,
  isValidSWIFT,
  generateReference,
  sleep,
  debounce,
  retry,
  deepClone,
  sanitizeForLogging
};