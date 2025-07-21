/**
 * TropiPay Wallet SDK - TypeScript Definitions
 * 
 * Complete TypeScript definitions for the TropiPay Wallet SDK.
 * These types provide full IntelliSense support and compile-time
 * type checking for TypeScript projects.
 * 
 * @version 1.0.0
 */

/// <reference types="node" />

import { EventEmitter } from 'events';

// =============================================================================
// CORE SDK TYPES
// =============================================================================

/**
 * SDK Configuration Options
 */
export interface SDKConfig {
  /** TropiPay Client ID (required) */
  clientId: string;
  
  /** TropiPay Client Secret (required) */
  clientSecret: string;
  
  /** API Environment */
  environment?: 'development' | 'production';
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Automatic token refresh */
  autoRefreshToken?: boolean;
  
  /** Retry configuration */
  retries?: {
    enabled?: boolean;
    max?: number;
    delay?: number;
  };
}

/**
 * Authentication Result
 */
export interface AuthenticationResult {
  /** OAuth2 access token */
  accessToken: string;
  
  /** Token expiration date */
  expiresAt: Date;
  
  /** User profile information */
  profile: UserProfile;
  
  /** User accounts */
  accounts: Account[];
}

/**
 * User Profile Information
 */
export interface UserProfile {
  /** User unique identifier */
  id: string;
  
  /** Email address */
  email: string;
  
  /** First name */
  firstName?: string;
  
  /** Last name */
  lastName?: string;
  
  /** Phone number */
  phoneNumber?: string;
  
  /** KYC verification level (0-3) */
  kycLevel: number;
  
  /** Two-factor authentication type (1=SMS, 2=Google Authenticator) */
  twoFaType: number;
  
  /** Account creation date */
  createdAt?: Date;
  
  /** Last login date */
  lastLoginAt?: Date;
  
  /** Account status */
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

/**
 * Account Information
 */
export interface Account {
  /** Account unique identifier */
  accountId: string;
  
  /** Account currency code */
  currency: string;
  
  /** Total account balance */
  balance: number;
  
  /** Available balance for transactions */
  available: number;
  
  /** Blocked/frozen balance */
  blocked: number;
  
  /** Pending incoming transactions */
  pendingIn: number;
  
  /** Pending outgoing transactions */
  pendingOut: number;
  
  /** Account status */
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';
  
  /** Whether this is the default account */
  isDefault: boolean;
  
  /** Account creation date */
  createdAt?: Date;
  
  /** Last update date */
  updatedAt?: Date;
}

/**
 * Account Balance Summary
 */
export interface BalanceSummary {
  /** Total balance */
  total: number;
  
  /** Available balance */
  available: number;
  
  /** Blocked balance */
  blocked: number;
  
  /** Pending incoming */
  pendingIn: number;
  
  /** Pending outgoing */
  pendingOut: number;
  
  /** Account currency */
  currency: string;
  
  /** Last balance update */
  lastUpdated: Date;
}

/**
 * Balance Check Result
 */
export interface BalanceCheckResult {
  /** Whether balance is sufficient */
  sufficient: boolean;
  
  /** Available balance */
  available: number;
  
  /** Required amount */
  required: number;
  
  /** Amount short (if insufficient) */
  shortfall: number;
}

/**
 * Account Movement/Transaction
 */
export interface Movement {
  /** Movement unique identifier */
  id: string;
  
  /** Movement type */
  type: 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'REFUND';
  
  /** Transaction amount */
  amount: number;
  
  /** Transaction currency */
  currency: string;
  
  /** Transaction status */
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  /** Transaction description */
  description: string;
  
  /** Transaction reference */
  reference: string;
  
  /** Transaction date */
  createdAt: Date;
  
  /** Account balance after transaction */
  balanceAfter: number;
  
  /** Account balance before transaction */
  balanceBefore: number;
  
  /** Counterpart information */
  counterpart?: {
    name?: string;
    account?: string;
    type?: string;
  };
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Account Statistics
 */
export interface AccountStatistics {
  /** Statistics period */
  period: string;
  
  /** Total number of transactions */
  transactionCount: number;
  
  /** Total amount sent */
  totalSent: number;
  
  /** Total amount received */
  totalReceived: number;
  
  /** Total fees paid */
  totalFees: number;
  
  /** Average transaction amount */
  avgTransactionAmount: number;
}

// =============================================================================
// TRANSFER TYPES
// =============================================================================

/**
 * Transfer Simulation Data
 */
export interface TransferData {
  /** Source account identifier */
  fromAccountId: string;
  
  /** Destination beneficiary identifier */
  beneficiaryId: string;
  
  /** Transfer amount */
  amount: number;
  
  /** Transfer currency (optional) */
  currency?: string;
  
  /** Transfer reason/description */
  reason?: string;
  
  /** Custom reference */
  reference?: string;
  
  /** SMS verification code */
  smsCode?: string;
  
  /** Google Authenticator code */
  googleAuthCode?: string;
}

/**
 * Transfer Simulation Result
 */
export interface TransferSimulation {
  /** Total amount to be deducted */
  amountToPay: number;
  
  /** Amount recipient will receive */
  amountToReceive: number;
  
  /** Total transfer fees */
  fees: number;
  
  /** Exchange rate (if currency conversion) */
  exchangeRate: number;
  
  /** Source currency */
  fromCurrency: string;
  
  /** Destination currency */
  toCurrency: string;
  
  /** Whether 2FA is required */
  requires2FA: boolean;
  
  /** Account balance after transfer */
  accountBalanceAfter: number;
  
  /** Estimated arrival time */
  estimatedArrival: string;
  
  /** Fee breakdown */
  breakdown: {
    baseFee: number;
    exchangeFee: number;
    internationalFee: number;
  };
  
  /** Recipient information */
  recipient: Record<string, any>;
}

/**
 * Transfer Execution Result
 */
export interface TransferResult {
  /** Transfer unique identifier */
  transferId: string;
  
  /** Transfer reference number */
  reference: string;
  
  /** Transfer status */
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  /** Amount deducted from account */
  amountSent: number;
  
  /** Amount received by recipient */
  amountReceived: number;
  
  /** Fees charged */
  fees: number;
  
  /** Transfer creation date */
  createdAt: Date;
  
  /** Last update date */
  updatedAt?: Date;
  
  /** Estimated arrival time */
  estimatedArrival?: string;
  
  /** Recipient information */
  recipient: Record<string, any>;
  
  /** Transfer currency */
  currency: string;
  
  /** Transfer type */
  type: string;
  
  /** Transfer description */
  description: string;
}

/**
 * Transfer History Query Options
 */
export interface TransferHistoryOptions {
  /** Number of records to skip */
  offset?: number;
  
  /** Maximum records to return */
  limit?: number;
  
  /** Filter from date */
  startDate?: Date;
  
  /** Filter until date */
  endDate?: Date;
  
  /** Filter by status */
  status?: string;
  
  /** Filter by account ID */
  accountId?: string;
}

// =============================================================================
// BENEFICIARY TYPES
// =============================================================================

/**
 * Beneficiary Information
 */
export interface Beneficiary {
  /** Beneficiary unique identifier */
  id: string;
  
  /** Beneficiary type */
  type: 'INTERNAL' | 'EXTERNAL';
  
  /** Full name */
  name: string;
  
  /** First name */
  firstName: string;
  
  /** Last name */
  lastName: string;
  
  /** Email address */
  email?: string;
  
  /** Phone number */
  phoneNumber?: string;
  
  /** Account number or IBAN */
  accountNumber: string;
  
  /** Account currency */
  currency: string;
  
  /** Country code */
  country: string;
  
  /** Country name */
  countryName?: string;
  
  /** Bank details (for external accounts) */
  bankDetails: {
    name?: string;
    swiftCode?: string;
    routingNumber?: string;
    address?: string;
  };
  
  /** Beneficiary address */
  address?: string;
  
  /** City */
  city?: string;
  
  /** Postal code */
  postalCode?: string;
  
  /** Relationship to sender */
  relationship?: string;
  
  /** Transfer purpose */
  purpose?: string;
  
  /** Whether account is verified */
  isVerified: boolean;
  
  /** Whether beneficiary is active */
  isActive: boolean;
  
  /** Creation date */
  createdAt: Date;
  
  /** Last update date */
  updatedAt?: Date;
}

/**
 * Beneficiary Creation Data
 */
export interface BeneficiaryData {
  /** Beneficiary type */
  type: 'INTERNAL' | 'EXTERNAL';
  
  /** First name */
  firstName: string;
  
  /** Last name */
  lastName: string;
  
  /** Email address (required for internal) */
  email?: string;
  
  /** Phone number */
  phoneNumber?: string;
  
  /** Account number, IBAN, or email */
  accountNumber: string;
  
  /** Account currency */
  currency: string;
  
  /** Country code (ISO 2-letter) */
  country: string;
  
  /** Bank information (for external accounts) */
  bankDetails?: {
    name?: string;
    swiftCode?: string;
    routingNumber?: string;
    address?: string;
  };
  
  /** Beneficiary address */
  address?: string;
  
  /** City */
  city?: string;
  
  /** Postal code */
  postalCode?: string;
  
  /** Relationship to sender */
  relationship?: string;
  
  /** Transfer purpose */
  purpose?: string;
}

/**
 * Account Validation Result
 */
export interface ValidationResult {
  /** Whether account/code is valid */
  valid: boolean;
  
  /** Validation message */
  message: string;
  
  /** Bank information (if found) */
  bankInfo?: {
    name?: string;
    branch?: string;
    address?: string;
    country?: string;
  };
}

/**
 * Beneficiary Query Options
 */
export interface BeneficiaryQueryOptions {
  /** Number of records to skip */
  offset?: number;
  
  /** Maximum records to return */
  limit?: number;
  
  /** Filter by type */
  type?: 'INTERNAL' | 'EXTERNAL';
  
  /** Filter by currency */
  currency?: string;
  
  /** Filter by country */
  country?: string;
  
  /** Search by name, email, or account */
  search?: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Base TropiPay Error
 */
export class TropiPayError extends Error {
  code: string;
  details: Record<string, any>;
  timestamp: string;
  
  constructor(message: string, code?: string, details?: Record<string, any>);
  toJSON(): Record<string, any>;
}

/**
 * Authentication Error
 */
export class AuthenticationError extends TropiPayError {
  constructor(message: string, details?: Record<string, any>);
}

/**
 * Validation Error
 */
export class ValidationError extends TropiPayError {
  validationErrors: Record<string, any>;
  
  constructor(message: string, validationErrors?: Record<string, any>);
}

/**
 * API Error
 */
export class APIError extends TropiPayError {
  statusCode: number;
  response: Record<string, any>;
  
  constructor(message: string, statusCode?: number, response?: Record<string, any>);
}

/**
 * Network Error
 */
export class NetworkError extends TropiPayError {
  constructor(message: string, details?: Record<string, any>);
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends TropiPayError {
  retryAfter: number;
  
  constructor(message: string, retryAfter?: number);
}

/**
 * Insufficient Funds Error
 */
export class InsufficientFundsError extends TropiPayError {
  constructor(message: string, details?: Record<string, any>);
}

/**
 * Account Error
 */
export class AccountError extends TropiPayError {
  accountId: string | null;
  
  constructor(message: string, accountId?: string | null);
}

/**
 * Transfer Error
 */
export class TransferError extends TropiPayError {
  transferDetails: Record<string, any>;
  
  constructor(message: string, transferDetails?: Record<string, any>);
}

// =============================================================================
// MODULE INTERFACES
// =============================================================================

/**
 * Authentication Module
 */
export interface AuthModule {
  authenticate(clientId: string, clientSecret: string): Promise<AuthenticationResult>;
  refreshToken(refreshToken: string): Promise<AuthenticationResult>;
  validateToken(accessToken: string): Promise<boolean>;
  getCurrentProfile(): Promise<UserProfile>;
  updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile>;
  changePassword(currentPassword: string, newPassword: string): Promise<Record<string, any>>;
  logout(): Promise<void>;
}

/**
 * Accounts Module
 */
export interface AccountsModule {
  getAll(): Promise<Account[]>;
  getById(accountId: string): Promise<Account>;
  getByCurrency(currency: string): Promise<Account[]>;
  getDefault(currency?: string): Promise<Account | null>;
  getMovements(accountId: string, options?: {
    offset?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    type?: string;
  }): Promise<Movement[]>;
  getBalance(accountId: string): Promise<BalanceSummary>;
  refresh(): Promise<Account[]>;
  checkBalance(accountId: string, amount: number): Promise<BalanceCheckResult>;
  getStatistics(accountId: string, options?: { days?: number }): Promise<AccountStatistics>;
}

/**
 * Transfers Module
 */
export interface TransfersModule {
  simulate(transferData: TransferData): Promise<TransferSimulation>;
  execute(transferData: TransferData): Promise<TransferResult>;
  getStatus(transferId: string): Promise<TransferResult>;
  cancel(transferId: string): Promise<TransferResult>;
  getHistory(options?: TransferHistoryOptions): Promise<TransferResult[]>;
  requestSMSCode(phoneNumber: string): Promise<Record<string, any>>;
}

/**
 * Beneficiaries Module
 */
export interface BeneficiariesModule {
  getAll(options?: BeneficiaryQueryOptions): Promise<Beneficiary[]>;
  getById(beneficiaryId: string): Promise<Beneficiary>;
  create(beneficiaryData: BeneficiaryData): Promise<Beneficiary>;
  update(beneficiaryId: string, updateData: Partial<BeneficiaryData>): Promise<Beneficiary>;
  delete(beneficiaryId: string): Promise<Record<string, any>>;
  validateAccountNumber(validationData: {
    accountNumber: string;
    country: string;
    bankCode?: string;
  }): Promise<ValidationResult>;
  validateSwiftCode(validationData: {
    swiftCode: string;
  }): Promise<ValidationResult>;
  search(query: string, options?: BeneficiaryQueryOptions): Promise<Beneficiary[]>;
}

// =============================================================================
// MAIN SDK CLASS
// =============================================================================

/**
 * Main TropiPay SDK Class
 */
export declare class TropiPaySDK extends EventEmitter {
  /** Authentication module */
  readonly auth: AuthModule;
  
  /** Accounts module */
  readonly accounts: AccountsModule;
  
  /** Transfers module */
  readonly transfers: TransfersModule;
  
  /** Beneficiaries module */
  readonly beneficiaries: BeneficiariesModule;
  
  constructor(config: SDKConfig);
  
  /**
   * Authenticate with TropiPay API
   */
  authenticate(): Promise<AuthenticationResult>;
  
  /**
   * Check if SDK is authenticated
   */
  isAuthenticated(): boolean;
  
  /**
   * Get current user profile
   */
  getUserProfile(): UserProfile | null;
  
  /**
   * Get current access token
   */
  getAccessToken(): string | null;
  
  /**
   * Get token expiry date
   */
  getTokenExpiry(): Date | null;
  
  /**
   * Logout and clear authentication
   */
  logout(): void;
  
  /**
   * Make raw HTTP request
   */
  request(options: Record<string, any>): Promise<Record<string, any>>;
  
  /**
   * Get SDK configuration
   */
  getConfig(): Partial<SDKConfig>;
  
  /**
   * Update SDK configuration
   */
  updateConfig(newConfig: Partial<SDKConfig>): void;
  
  // Event emitter methods
  on(event: 'authenticated', listener: (result: AuthenticationResult) => void): this;
  on(event: 'tokenExpired', listener: () => void): this;
  on(event: 'transferCompleted', listener: (transfer: TransferResult) => void): this;
  on(event: 'transferFailed', listener: (error: Error) => void): this;
  on(event: 'beneficiaryCreated', listener: (beneficiary: Beneficiary) => void): this;
  on(event: 'beneficiaryUpdated', listener: (beneficiary: Beneficiary) => void): this;
  on(event: 'beneficiaryDeleted', listener: (data: { beneficiaryId: string }) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'request', listener: (config: Record<string, any>) => void): this;
  on(event: 'response', listener: (response: Record<string, any>) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  
  emit(event: 'authenticated', result: AuthenticationResult): boolean;
  emit(event: 'tokenExpired'): boolean;
  emit(event: 'transferCompleted', transfer: TransferResult): boolean;
  emit(event: 'transferFailed', error: Error): boolean;
  emit(event: 'beneficiaryCreated', beneficiary: Beneficiary): boolean;
  emit(event: 'beneficiaryUpdated', beneficiary: Beneficiary): boolean;
  emit(event: 'beneficiaryDeleted', data: { beneficiaryId: string }): boolean;
  emit(event: 'error', error: Error): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

// =============================================================================
// CONSTANTS AND ENUMS
// =============================================================================

/**
 * API Environments
 */
export const ENVIRONMENTS: {
  development: string; // https://sandbox.tropipay.me/api/v3
  production: string;  // https://www.tropipay.com/api/v3
};

/**
 * Supported Currencies
 */
export const CURRENCIES: {
  USD: { code: string; name: string; symbol: string; decimals: number };
  EUR: { code: string; name: string; symbol: string; decimals: number };
  CUP: { code: string; name: string; symbol: string; decimals: number };
};

/**
 * Transfer Types
 */
export const TRANSFER_TYPES: {
  INTERNAL: { code: string; name: string; description: string };
  EXTERNAL: { code: string; name: string; description: string };
  CARD_DEPOSIT: { code: string; name: string; description: string };
  BANK_DEPOSIT: { code: string; name: string; description: string };
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

/**
 * Default export - TropiPaySDK class
 */
export default TropiPaySDK;

/**
 * Named exports
 */
export {
  TropiPaySDK,
  TropiPayError,
  AuthenticationError,
  ValidationError,
  APIError,
  NetworkError,
  RateLimitError,
  InsufficientFundsError,
  AccountError,
  TransferError
};