/**
 * TropiPay SDK Constants
 * 
 * This module contains all constants used throughout the SDK including
 * API endpoints, environment configurations, currency codes, and other
 * static values.
 */

/**
 * TropiPay API environments and their base URLs
 * 
 * @type {Object<string, string>}
 */
const ENVIRONMENTS = {
  development: 'https://sandbox.tropipay.me/api/v3',
  production: 'https://www.tropipay.com/api/v3'
};

/**
 * Supported currency codes
 * 
 * @type {Object<string, Object>}
 */
const CURRENCIES = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2
  },
  EUR: {
    code: 'EUR', 
    name: 'Euro',
    symbol: '€',
    decimals: 2
  },
  CUP: {
    code: 'CUP',
    name: 'Cuban Peso',
    symbol: 'CUP',
    decimals: 2
  }
};

/**
 * Transfer types and their descriptions
 * 
 * @type {Object<string, Object>}
 */
const TRANSFER_TYPES = {
  INTERNAL: {
    code: 'INTERNAL',
    name: 'Internal Transfer',
    description: 'Transfer between TropiPay accounts'
  },
  EXTERNAL: {
    code: 'EXTERNAL', 
    name: 'External Transfer',
    description: 'Transfer to external bank accounts'
  },
  CARD_DEPOSIT: {
    code: 'CARD_DEPOSIT',
    name: 'Card Deposit',
    description: 'Deposit from credit/debit card'
  },
  BANK_DEPOSIT: {
    code: 'BANK_DEPOSIT',
    name: 'Bank Deposit', 
    description: 'Deposit from bank account'
  }
};

/**
 * Account statuses
 * 
 * @type {Object<string, Object>}
 */
const ACCOUNT_STATUSES = {
  ACTIVE: {
    code: 'ACTIVE',
    name: 'Active',
    description: 'Account is active and operational'
  },
  INACTIVE: {
    code: 'INACTIVE',
    name: 'Inactive',
    description: 'Account is inactive'
  },
  SUSPENDED: {
    code: 'SUSPENDED',
    name: 'Suspended',
    description: 'Account is temporarily suspended'
  },
  BLOCKED: {
    code: 'BLOCKED',
    name: 'Blocked', 
    description: 'Account is blocked'
  }
};

/**
 * Transaction statuses
 * 
 * @type {Object<string, Object>}
 */
const TRANSACTION_STATUSES = {
  PENDING: {
    code: 'PENDING',
    name: 'Pending',
    description: 'Transaction is pending processing'
  },
  PROCESSING: {
    code: 'PROCESSING',
    name: 'Processing',
    description: 'Transaction is being processed'
  },
  COMPLETED: {
    code: 'COMPLETED',
    name: 'Completed',
    description: 'Transaction completed successfully'
  },
  FAILED: {
    code: 'FAILED',
    name: 'Failed',
    description: 'Transaction failed'
  },
  CANCELLED: {
    code: 'CANCELLED',
    name: 'Cancelled',
    description: 'Transaction was cancelled'
  }
};

/**
 * Movement types in transaction history
 * 
 * @type {Object<string, Object>}
 */
const MOVEMENT_TYPES = {
  TRANSFER_IN: {
    code: 'TRANSFER_IN',
    name: 'Transfer In',
    description: 'Incoming transfer'
  },
  TRANSFER_OUT: {
    code: 'TRANSFER_OUT',
    name: 'Transfer Out',
    description: 'Outgoing transfer'
  },
  DEPOSIT: {
    code: 'DEPOSIT',
    name: 'Deposit',
    description: 'Account deposit'
  },
  WITHDRAWAL: {
    code: 'WITHDRAWAL',
    name: 'Withdrawal',
    description: 'Account withdrawal'
  },
  FEE: {
    code: 'FEE',
    name: 'Fee',
    description: 'Transaction fee'
  },
  REFUND: {
    code: 'REFUND',
    name: 'Refund',
    description: 'Transaction refund'
  }
};

/**
 * KYC (Know Your Customer) levels
 * 
 * @type {Object<number, Object>}
 */
const KYC_LEVELS = {
  0: {
    level: 0,
    name: 'Unverified',
    description: 'No verification completed',
    limits: {
      dailyTransaction: 0,
      monthlyTransaction: 0
    }
  },
  1: {
    level: 1,
    name: 'Basic Verification',
    description: 'Basic identity verification completed',
    limits: {
      dailyTransaction: 100000, // in centavos
      monthlyTransaction: 500000
    }
  },
  2: {
    level: 2,
    name: 'Enhanced Verification',
    description: 'Enhanced verification with documents',
    limits: {
      dailyTransaction: 500000,
      monthlyTransaction: 2000000
    }
  },
  3: {
    level: 3,
    name: 'Full Verification',
    description: 'Complete verification with bank details',
    limits: {
      dailyTransaction: 1000000,
      monthlyTransaction: 5000000
    }
  }
};

/**
 * Beneficiary account types
 * 
 * @type {Object<string, Object>}
 */
const BENEFICIARY_TYPES = {
  INTERNAL: {
    code: 'INTERNAL',
    name: 'TropiPay Account',
    description: 'Another TropiPay user account'
  },
  EXTERNAL: {
    code: 'EXTERNAL',
    name: 'External Bank Account',
    description: 'External bank account'
  },
  CARD: {
    code: 'CARD',
    name: 'Credit/Debit Card',
    description: 'Credit or debit card'
  }
};

/**
 * Country codes and names
 * 
 * @type {Object<string, Object>}
 */
const COUNTRIES = {
  US: { code: 'US', name: 'United States', currency: 'USD' },
  ES: { code: 'ES', name: 'Spain', currency: 'EUR' },
  CU: { code: 'CU', name: 'Cuba', currency: 'CUP' },
  MX: { code: 'MX', name: 'Mexico', currency: 'USD' },
  CA: { code: 'CA', name: 'Canada', currency: 'USD' },
  FR: { code: 'FR', name: 'France', currency: 'EUR' },
  IT: { code: 'IT', name: 'Italy', currency: 'EUR' },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR' },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'EUR' }
};

/**
 * API endpoints paths
 * 
 * @type {Object<string, string>}
 */
const ENDPOINTS = {
  // Authentication
  ACCESS_TOKEN: '/access/token',
  USER_PROFILE: '/users/profile',
  
  // Accounts
  ACCOUNTS: '/accounts',
  ACCOUNT_MOVEMENTS: '/accounts/{accountId}/movements',
  
  // Transfers
  TRANSFER_SIMULATE: '/booking/payout/simulate',
  TRANSFER_EXECUTE: '/booking/payout',
  
  // Beneficiaries
  BENEFICIARIES: '/deposit_accounts',
  BENEFICIARY_VALIDATE_ACCOUNT: '/deposit_accounts/validate_account_number',
  BENEFICIARY_VALIDATE_SWIFT: '/deposit_accounts/Validate_Swift',
  
  // 2FA
  SMS_SEND: '/users/sms/send',
  
  // Utilities
  HEALTH: '/health'
};

/**
 * Error codes used throughout the SDK
 * 
 * @type {Object<string, string>}
 */
const ERROR_CODES = {
  // Authentication errors
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS', 
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // API errors
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Business logic errors
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  BENEFICIARY_NOT_FOUND: 'BENEFICIARY_NOT_FOUND',
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  
  // General errors
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  SERVICE_ERROR: 'SERVICE_ERROR'
};

/**
 * Default configuration values
 * 
 * @type {Object}
 */
const DEFAULTS = {
  environment: 'development',
  timeout: 10000,
  debug: false,
  autoRefreshToken: true,
  retries: {
    enabled: true,
    max: 3,
    delay: 1000
  },
  pagination: {
    limit: 20,
    offset: 0
  }
};

module.exports = {
  ENVIRONMENTS,
  CURRENCIES,
  TRANSFER_TYPES,
  ACCOUNT_STATUSES,
  TRANSACTION_STATUSES,
  MOVEMENT_TYPES,
  KYC_LEVELS,
  BENEFICIARY_TYPES,
  COUNTRIES,
  ENDPOINTS,
  ERROR_CODES,
  DEFAULTS
};