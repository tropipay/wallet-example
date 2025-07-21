/**
 * TropiPay SDK - Accounts Module
 * 
 * This module provides comprehensive account management functionality including
 * balance retrieval, account information, transaction history, and account operations.
 * All amounts are automatically converted from TropiPay's centavos format to
 * user-friendly decimal amounts.
 * 
 * @author TropiPay Team
 * @version 1.0.0
 */

const { ENDPOINTS, MOVEMENT_TYPES } = require('../utils/constants');
const { AuthenticationError, ValidationError, AccountError } = require('../utils/errors');
const { convertFromCentavos, isValidCurrency, formatCurrency } = require('../utils/helpers');

/**
 * Accounts Module
 * 
 * Provides methods for account management, balance retrieval, and transaction history.
 * All currency amounts are handled in user-friendly decimal format.
 * 
 * @class AccountsModule
 */
class AccountsModule {
  /**
   * Create accounts module
   * 
   * @param {TropiPaySDK} sdk - Reference to main SDK instance
   */
  constructor(sdk) {
    this.sdk = sdk;
    this._httpClient = sdk._httpClient;
  }

  /**
   * Get all user accounts with balance information
   * 
   * Retrieves all accounts associated with the authenticated user, including
   * balance information, currency details, and account status.
   * 
   * @returns {Promise<Array<Object>>} Array of account objects
   * @returns {string} returns[].accountId - Unique account identifier
   * @returns {string} returns[].currency - Account currency code (USD, EUR, CUP)
   * @returns {number} returns[].balance - Total account balance
   * @returns {number} returns[].available - Available balance for transactions
   * @returns {number} returns[].blocked - Blocked/frozen balance
   * @returns {number} returns[].pendingIn - Incoming pending transactions
   * @returns {number} returns[].pendingOut - Outgoing pending transactions
   * @returns {string} returns[].status - Account status (ACTIVE, INACTIVE, etc.)
   * @returns {boolean} returns[].isDefault - Whether this is the default account
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * 
   * @example
   * // Get all user accounts
   * try {
   *   const accounts = await sdk.accounts.getAll();
   *   
   *   accounts.forEach(account => {
   *     console.log(`${account.currency} Account:`);
   *     console.log(`  Balance: ${formatCurrency(account.balance, account.currency)}`);
   *     console.log(`  Available: ${formatCurrency(account.available, account.currency)}`);
   *     console.log(`  Status: ${account.status}`);
   *     
   *     if (account.blocked > 0) {
   *       console.log(`  Blocked: ${formatCurrency(account.blocked, account.currency)}`);
   *     }
   *   });
   * } catch (error) {
   *   console.error('Failed to fetch accounts:', error.message);
   * }
   * 
   * @example
   * // Display account summary in a wallet UI
   * const displayAccountSummary = async () => {
   *   const accounts = await sdk.accounts.getAll();
   *   
   *   const totalBalance = accounts.reduce((sum, account) => {
   *     // Convert all to USD for total (simplified example)
   *     return sum + (account.currency === 'USD' ? account.balance : 0);
   *   }, 0);
   *   
   *   return {
   *     totalAccounts: accounts.length,
   *     totalBalance: totalBalance,
   *     accounts: accounts.map(acc => ({
   *       id: acc.accountId,
   *       currency: acc.currency,
   *       balance: acc.balance,
   *       formatted: formatCurrency(acc.balance, acc.currency)
   *     }))
   *   };
   * };
   */
  async getAll() {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const response = await this._httpClient.get(ENDPOINTS.ACCOUNTS);
      const accounts = Array.isArray(response.data) ? response.data : [];

      // Convert amounts and enhance account data
      return accounts.map(account => this._processAccountData(account));

    } catch (error) {
      if (this.sdk.config.debug) {
        console.error('❌ Failed to fetch accounts:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get specific account by ID
   * 
   * @param {string} accountId - Account identifier
   * @returns {Promise<Object>} Account information
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AccountError} When account is not found
   * 
   * @example
   * // Get specific account details
   * const account = await sdk.accounts.getById('account_123');
   * console.log(`Account balance: ${formatCurrency(account.balance, account.currency)}`);
   */
  async getById(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      throw new ValidationError('Account ID is required');
    }

    const accounts = await this.getAll();
    const account = accounts.find(acc => acc.accountId === accountId);

    if (!account) {
      throw new AccountError(`Account not found: ${accountId}`, accountId);
    }

    return account;
  }

  /**
   * Get accounts by currency
   * 
   * @param {string} currency - Currency code (USD, EUR, CUP)
   * @returns {Promise<Array<Object>>} Accounts in specified currency
   * @throws {ValidationError} When currency is invalid
   * 
   * @example
   * // Get all USD accounts
   * const usdAccounts = await sdk.accounts.getByCurrency('USD');
   * const totalUSD = usdAccounts.reduce((sum, acc) => sum + acc.balance, 0);
   */
  async getByCurrency(currency) {
    if (!isValidCurrency(currency)) {
      throw new ValidationError(`Invalid currency: ${currency}`);
    }

    const accounts = await this.getAll();
    return accounts.filter(account => account.currency === currency);
  }

  /**
   * Get default account for a currency
   * 
   * @param {string} [currency='USD'] - Currency code
   * @returns {Promise<Object|null>} Default account or null if not found
   * 
   * @example
   * // Get default USD account
   * const defaultAccount = await sdk.accounts.getDefault('USD');
   * if (defaultAccount) {
   *   console.log('Default USD balance:', defaultAccount.balance);
   * }
   */
  async getDefault(currency = 'USD') {
    if (!isValidCurrency(currency)) {
      throw new ValidationError(`Invalid currency: ${currency}`);
    }

    const accounts = await this.getByCurrency(currency);
    
    // Look for explicitly marked default account
    const defaultAccount = accounts.find(acc => acc.isDefault);
    if (defaultAccount) {
      return defaultAccount;
    }

    // Return first account of that currency as fallback
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Get account transaction history (movements)
   * 
   * Retrieves paginated transaction history for a specific account,
   * including all incoming and outgoing transactions, fees, and other movements.
   * 
   * @param {string} accountId - Account identifier
   * @param {Object} [options] - Query options
   * @param {number} [options.offset=0] - Number of records to skip
   * @param {number} [options.limit=20] - Maximum records to return
   * @param {Date} [options.startDate] - Filter transactions from this date
   * @param {Date} [options.endDate] - Filter transactions until this date
   * @param {string} [options.type] - Movement type filter
   * @returns {Promise<Array<Object>>} Array of movement/transaction objects
   * @returns {string} returns[].id - Transaction identifier
   * @returns {string} returns[].type - Movement type (TRANSFER_IN, TRANSFER_OUT, etc.)
   * @returns {number} returns[].amount - Transaction amount
   * @returns {string} returns[].currency - Transaction currency
   * @returns {string} returns[].status - Transaction status
   * @returns {Date} returns[].createdAt - Transaction date
   * @returns {string} returns[].description - Transaction description
   * @returns {Object} returns[].counterpart - Other party information (if available)
   * @returns {number} returns[].balanceAfter - Account balance after transaction
   * @returns {number} returns[].balanceBefore - Account balance before transaction
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AccountError} When account is not found
   * @throws {ValidationError} When parameters are invalid
   * 
   * @example
   * // Get recent transactions
   * const movements = await sdk.accounts.getMovements('account_123', {
   *   limit: 10
   * });
   * 
   * movements.forEach(movement => {
   *   const sign = movement.type === 'TRANSFER_IN' ? '+' : '-';
   *   console.log(`${movement.createdAt.toLocaleDateString()}: ${sign}${movement.amount} ${movement.currency}`);
   *   console.log(`  ${movement.description}`);
   *   console.log(`  Balance after: ${movement.balanceAfter}`);
   * });
   * 
   * @example
   * // Get filtered transaction history
   * const lastMonth = new Date();
   * lastMonth.setMonth(lastMonth.getMonth() - 1);
   * 
   * const recentMovements = await sdk.accounts.getMovements('account_123', {
   *   startDate: lastMonth,
   *   type: 'TRANSFER_OUT',
   *   limit: 50
   * });
   * 
   * const totalSent = recentMovements.reduce((sum, mov) => sum + mov.amount, 0);
   * console.log(`Total sent last month: ${formatCurrency(totalSent, 'USD')}`);
   * 
   * @example
   * // Build transaction history with pagination
   * const loadTransactionHistory = async (accountId, page = 1, pageSize = 20) => {
   *   const offset = (page - 1) * pageSize;
   *   
   *   const movements = await sdk.accounts.getMovements(accountId, {
   *     offset,
   *     limit: pageSize
   *   });
   *   
   *   return {
   *     page,
   *     pageSize,
   *     movements: movements.map(mov => ({
   *       id: mov.id,
   *       date: mov.createdAt,
   *       description: mov.description,
   *       amount: mov.amount,
   *       currency: mov.currency,
   *       type: mov.type,
   *       status: mov.status,
   *       formattedAmount: formatCurrency(mov.amount, mov.currency)
   *     })),
   *     hasMore: movements.length === pageSize
   *   };
   * };
   */
  async getMovements(accountId, options = {}) {
    if (!accountId || typeof accountId !== 'string') {
      throw new ValidationError('Account ID is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    const {
      offset = 0,
      limit = 20,
      startDate,
      endDate,
      type
    } = options;

    // Validate pagination parameters
    if (typeof offset !== 'number' || offset < 0) {
      throw new ValidationError('Offset must be a non-negative number');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    // Validate date parameters
    if (startDate && !(startDate instanceof Date)) {
      throw new ValidationError('Start date must be a Date object');
    }

    if (endDate && !(endDate instanceof Date)) {
      throw new ValidationError('End date must be a Date object');
    }

    if (type && !Object.keys(MOVEMENT_TYPES).includes(type)) {
      throw new ValidationError(`Invalid movement type: ${type}`);
    }

    try {
      // Build query parameters
      const params = { offset, limit };
      
      if (startDate) {
        params.start_date = startDate.toISOString().split('T')[0];
      }
      
      if (endDate) {
        params.end_date = endDate.toISOString().split('T')[0];
      }
      
      if (type) {
        params.type = type;
      }

      const endpoint = ENDPOINTS.ACCOUNT_MOVEMENTS.replace('{accountId}', accountId);
      const response = await this._httpClient.get(endpoint, { params });

      // Handle different response formats
      let movements = [];
      if (response.data?.rows) {
        movements = response.data.rows;
      } else if (Array.isArray(response.data)) {
        movements = response.data;
      }

      // Process and convert movement data
      return movements.map(movement => this._processMovementData(movement));

    } catch (error) {
      if (error.response?.status === 404) {
        throw new AccountError(`Account not found: ${accountId}`, accountId);
      }

      if (this.sdk.config.debug) {
        console.error('❌ Failed to fetch movements:', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Get account balance summary
   * 
   * @param {string} accountId - Account identifier
   * @returns {Promise<Object>} Balance summary
   * @returns {number} returns.total - Total balance
   * @returns {number} returns.available - Available balance
   * @returns {number} returns.blocked - Blocked balance
   * @returns {number} returns.pendingIn - Pending incoming
   * @returns {number} returns.pendingOut - Pending outgoing
   * @returns {string} returns.currency - Account currency
   * @returns {Date} returns.lastUpdated - Last balance update
   * 
   * @example
   * // Get balance summary
   * const summary = await sdk.accounts.getBalance('account_123');
   * console.log(`Available: ${formatCurrency(summary.available, summary.currency)}`);
   * console.log(`Pending: ${formatCurrency(summary.pendingIn, summary.currency)}`);
   */
  async getBalance(accountId) {
    const account = await this.getById(accountId);
    
    return {
      total: account.balance,
      available: account.available,
      blocked: account.blocked,
      pendingIn: account.pendingIn,
      pendingOut: account.pendingOut,
      currency: account.currency,
      lastUpdated: new Date()
    };
  }

  /**
   * Refresh account information
   * 
   * Forces a refresh of account data from TropiPay servers.
   * Useful when you need the most up-to-date balance information.
   * 
   * @returns {Promise<Array<Object>>} Updated account information
   * 
   * @example
   * // Refresh accounts after a transfer
   * await sdk.transfers.execute(transferData);
   * const updatedAccounts = await sdk.accounts.refresh();
   * updateUI(updatedAccounts);
   */
  async refresh() {
    // Clear any cached data (if implemented in future)
    return await this.getAll();
  }

  /**
   * Check if account has sufficient balance for a transaction
   * 
   * @param {string} accountId - Account identifier
   * @param {number} amount - Amount to check
   * @returns {Promise<Object>} Balance check result
   * @returns {boolean} returns.sufficient - Whether balance is sufficient
   * @returns {number} returns.available - Available balance
   * @returns {number} returns.required - Required amount
   * @returns {number} returns.shortfall - Amount short (if insufficient)
   * 
   * @example
   * // Check balance before transfer
   * const check = await sdk.accounts.checkBalance('account_123', 100.50);
   * if (!check.sufficient) {
   *   console.log(`Insufficient funds. Need $${check.shortfall.toFixed(2)} more.`);
   * }
   */
  async checkBalance(accountId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    const balance = await this.getBalance(accountId);
    
    const sufficient = balance.available >= amount;
    const shortfall = sufficient ? 0 : amount - balance.available;

    return {
      sufficient,
      available: balance.available,
      required: amount,
      shortfall
    };
  }

  /**
   * Get account statistics
   * 
   * @param {string} accountId - Account identifier
   * @param {Object} [options] - Statistics options
   * @param {number} [options.days=30] - Number of days for statistics
   * @returns {Promise<Object>} Account statistics
   * 
   * @example
   * // Get 30-day account statistics
   * const stats = await sdk.accounts.getStatistics('account_123');
   * console.log('Transactions this month:', stats.transactionCount);
   * console.log('Total sent:', stats.totalSent);
   * console.log('Total received:', stats.totalReceived);
   */
  async getStatistics(accountId, options = {}) {
    const { days = 30 } = options;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.getMovements(accountId, {
      startDate,
      limit: 1000 // Get more records for statistics
    });

    const stats = {
      period: `${days} days`,
      transactionCount: movements.length,
      totalSent: 0,
      totalReceived: 0,
      totalFees: 0,
      avgTransactionAmount: 0
    };

    movements.forEach(movement => {
      switch (movement.type) {
        case 'TRANSFER_OUT':
        case 'WITHDRAWAL':
          stats.totalSent += movement.amount;
          break;
        case 'TRANSFER_IN':
        case 'DEPOSIT':
          stats.totalReceived += movement.amount;
          break;
        case 'FEE':
          stats.totalFees += movement.amount;
          break;
      }
    });

    if (movements.length > 0) {
      const totalAmount = stats.totalSent + stats.totalReceived;
      stats.avgTransactionAmount = totalAmount / movements.length;
    }

    return stats;
  }

  /**
   * Process raw account data from API
   * @private
   */
  _processAccountData(account) {
    return {
      accountId: account.accountId || account.id,
      currency: account.currency,
      balance: convertFromCentavos(account.balance || 0),
      available: convertFromCentavos(account.available || account.balance || 0),
      blocked: convertFromCentavos(account.blocked || 0),
      pendingIn: convertFromCentavos(account.pendingIn || 0),
      pendingOut: convertFromCentavos(account.pendingOut || 0),
      status: account.status || 'ACTIVE',
      isDefault: account.isDefault || false,
      createdAt: account.createdAt ? new Date(account.createdAt) : null,
      updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date()
    };
  }

  /**
   * Process raw movement data from API
   * @private
   */
  _processMovementData(movement) {
    return {
      id: movement.id,
      type: movement.type,
      amount: convertFromCentavos(movement.amount || 0),
      currency: movement.currency,
      status: movement.status,
      description: movement.description || movement.concept || '',
      reference: movement.reference || movement.externalId || '',
      createdAt: movement.createdAt ? new Date(movement.createdAt) : new Date(),
      balanceAfter: convertFromCentavos(movement.balanceAfter || 0),
      balanceBefore: convertFromCentavos(movement.balanceBefore || 0),
      counterpart: movement.counterpart || null,
      metadata: movement.metadata || {}
    };
  }
}

module.exports = AccountsModule;