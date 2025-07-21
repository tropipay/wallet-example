/**
 * TropiPay Service - Complete API Integration Service
 * 
 * This service provides a complete interface to the TropiPay API, handling all
 * communication with TropiPay's sandbox and production environments. It's designed
 * as a standalone microservice that client developers can use to integrate TropiPay
 * wallet functionality into their applications.
 * 
 * @fileoverview Complete TropiPay API integration service
 * 
 * INTEGRATION GUIDE FOR CLIENT DEVELOPERS:
 * =======================================
 * 
 * 1. AUTHENTICATION FLOW:
 *    - Use getAccessToken() with your client credentials
 *    - Store the access token and expiration time
 *    - Use token for all subsequent API calls
 *    - Refresh token when expired (implement token refresh logic)
 * 
 * 2. ENVIRONMENT MANAGEMENT:
 *    - Use switchEnvironment() to change between sandbox/production
 *    - Start with 'development' for testing
 *    - Switch to 'production' for live transactions
 * 
 * 3. CURRENCY HANDLING:
 *    - TropiPay API uses centavos (cents) for all amounts
 *    - This service provides conversion utilities
 *    - Always convert amounts before sending to API
 * 
 * 4. ERROR HANDLING:
 *    - All methods throw errors that should be caught
 *    - API errors include detailed response information
 *    - Network errors include timeout and connection details
 * 
 * 5. COMMON INTEGRATION PATTERNS:
 * 
 * Basic Authentication:
 * ```javascript
 * const tropiPayService = require('./services/tropiPayService');
 * 
 * try {
 *   const tokenData = await tropiPayService.getAccessToken(clientId, clientSecret);
 *   const profile = await tropiPayService.getUserProfile(tokenData.access_token);
 * } catch (error) {
 *   console.error('Authentication failed:', error.message);
 * }
 * ```
 * 
 * Account Management:
 * ```javascript
 * const accounts = await tropiPayService.getAccounts(accessToken);
 * const convertedAccounts = tropiPayService.convertAccountsFromCentavos(accounts);
 * ```
 * 
 * Transfer Processing:
 * ```javascript
 * // 1. Simulate transfer first
 * const transferData = { accountId: '123', destinationId: '456', amount: 100.50 };
 * const preparedData = tropiPayService.prepareTransferData(transferData);
 * const simulation = await tropiPayService.simulateTransfer(token, preparedData);
 * 
 * // 2. Execute if simulation is acceptable
 * const result = await tropiPayService.executeTransfer(token, preparedData);
 * ```
 * 
 * 6. SECURITY BEST PRACTICES:
 *    - Never log access tokens in production
 *    - Use HTTPS for all API communications
 *    - Implement proper token storage and refresh
 *    - Validate all input data before API calls
 * 
 * @author TropiPay Integration Team
 * @version 2.0.0
 * @since 2024
 */

const axios = require('axios');
const config = require('../config/config');

/**
 * TropiPay API integration service
 * 
 * This class provides a complete interface to TropiPay's API, including
 * authentication, account management, beneficiary management, transfers,
 * and utility functions for currency conversion.
 */
class TropiPayService {
  /**
   * Initialize TropiPay service with default environment
   * 
   * Creates an instance of the TropiPay service with HTTP client configured
   * for the default environment. The service automatically sets up request
   * interceptors for detailed logging and error handling.
   * 
   * CLIENT INTEGRATION NOTES:
   * - Service initializes with environment from config.defaultTropiPayEnv
   * - HTTP client is automatically configured with proper timeouts
   * - Logging interceptors are set up for debugging
   * 
   * @constructor
   */
  constructor() {
    // HTTP client - will be updated dynamically based on environment
    this.client = null;
    this.currentEnvironment = config.defaultTropiPayEnv;
    
    // Initialize with default environment
    this.switchEnvironment(this.currentEnvironment);
  }

  /**
   * Switch TropiPay environment (development/production)
   * 
   * This method allows dynamic switching between TropiPay's sandbox (development)
   * and production environments. This is particularly useful for multi-tenant
   * applications or when you need to switch environments at runtime.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const tropiPayService = require('./services/tropiPayService');
   * 
   * // Switch to production for live transactions
   * const success = tropiPayService.switchEnvironment('production');
   * if (success) {
   *   console.log('Now using TropiPay production environment');
   * }
   * 
   * // Switch back to development for testing
   * tropiPayService.switchEnvironment('development');
   * ```
   * 
   * IMPORTANT NOTES:
   * - Invalid environments are rejected and current environment is maintained
   * - HTTP client is recreated with new base URL and timeouts
   * - Request/response interceptors are reconfigured
   * - All subsequent API calls will use the new environment
   * 
   * @param {string} environment - Target environment ('development' or 'production')
   * @returns {boolean} true if environment switch was successful, false otherwise
   * 
   * @example
   * // Switch to production for a specific user
   * if (user.isPremium) {
   *   tropiPayService.switchEnvironment('production');
   * }
   * 
   * @example
   * // Environment-specific operations
   * const success = tropiPayService.switchEnvironment('development');
   * if (success) {
   *   // Now all API calls will go to sandbox
   *   const accounts = await tropiPayService.getAccounts(token);
   * }
   */
  switchEnvironment(environment) {
    if (!config.isValidEnvironment(environment)) {
      console.warn(`⚠️  Invalid environment: ${environment}. Keeping: ${this.currentEnvironment}`);
      return false;
    }

    const baseURL = config.getTropiPayUrl(environment);
    
    console.log(`🔄 Switching TropiPay to environment: ${environment}`);
    console.log(`📡 New base URL: ${baseURL}`);

    this.client = axios.create({
      baseURL: baseURL,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.currentEnvironment = environment;
    this.setupInterceptors();
    return true;
  }

  /**
   * Get current active environment
   * 
   * Returns the currently active TropiPay environment. Use this to determine
   * which TropiPay API endpoint is currently being used for all requests.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const currentEnv = tropiPayService.getCurrentEnvironment();
   * console.log(`Currently using: ${currentEnv}`);
   * 
   * // Conditional logic based on environment
   * if (currentEnv === 'production') {
   *   // Production-specific logic
   *   enableAdvancedFeatures();
   * } else {
   *   // Development/testing logic
   *   enableDebugMode();
   * }
   * ```
   * 
   * @returns {string} Current environment ('development' or 'production')
   * 
   * @example
   * // Check environment before sensitive operations
   * const env = tropiPayService.getCurrentEnvironment();
   * if (env === 'production' && amount > 1000) {
   *   // Require additional validation for large amounts in production
   *   await requireAdditionalAuth();
   * }
   */
  getCurrentEnvironment() {
    return this.currentEnvironment;
  }

  /**
   * Configurar interceptors para logging detallado
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      console.log('\n🚀 === TROPIPAY API REQUEST ===');
      console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      console.log('📋 Headers:', JSON.stringify(config.headers, null, 2));
      if (config.data) {
        console.log('📦 Payload:', JSON.stringify(config.data, null, 2));
      }
      if (config.params) {
        console.log('🔗 Params:', JSON.stringify(config.params, null, 2));
      }
      console.log('==============================\n');
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('\n✅ === TROPIPAY API RESPONSE ===');
        console.log(`📥 ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));
        console.log('================================\n');
        return response;
      },
      (error) => {
        console.log('\n❌ === TROPIPAY API ERROR ===');
        console.log(`📥 ${error.response?.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        if (error.response?.headers) {
          console.log('📋 Error Headers:', JSON.stringify(error.response.headers, null, 2));
        }
        if (error.response?.data) {
          console.log('📦 Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('💥 Error Message:', error.message);
        }
        console.log('=============================\n');
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create authentication headers for TropiPay API requests
   * 
   * Generates the required headers for authenticated requests to TropiPay API.
   * These headers include the Bearer token and device identification required
   * by TropiPay's security protocols.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const headers = tropiPayService.createAuthHeaders(userToken);
   * // Use headers in custom axios requests or other HTTP clients
   * ```
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @returns {Object} Headers object for HTTP requests
   * @returns {string} returns.Authorization - Bearer token header
   * @returns {string} returns.X-DEVICE-ID - Device identification header
   * 
   * @example
   * const token = await tropiPayService.getAccessToken(clientId, clientSecret);
   * const headers = tropiPayService.createAuthHeaders(token.access_token);
   */
  createAuthHeaders(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'X-DEVICE-ID': config.deviceId
    };
  }

  // ========== AUTENTICACIÓN ==========

  /**
   * Obtain access token using client credentials
   * 
   * This is the first step in TropiPay integration. Use your client credentials
   * (provided by TropiPay) to obtain an access token for API operations.
   * 
   * INTEGRATION WORKFLOW:
   * 1. Call this method with your credentials
   * 2. Store the access_token and calculate expiration time
   * 3. Use the token for all subsequent API calls
   * 4. Refresh token before it expires
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const tokenData = await tropiPayService.getAccessToken(
   *     'your_client_id',
   *     'your_client_secret'
   *   );
   *   
   *   // Store token and expiration
   *   const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
   *   await storeToken(tokenData.access_token, expiresAt);
   *   
   *   console.log('Authentication successful');
   * } catch (error) {
   *   console.error('Authentication failed:', error.message);
   * }
   * ```
   * 
   * ERROR HANDLING:
   * - Invalid credentials: HTTP 401 - Check your client_id and client_secret
   * - Network issues: HTTP 5xx - Retry with exponential backoff
   * - Invalid environment: Check if using correct sandbox/production URLs
   * 
   * @param {string} clientId - Your TropiPay client ID
   * @param {string} clientSecret - Your TropiPay client secret
   * @returns {Promise<Object>} Token information object
   * @returns {string} returns.access_token - Bearer token for API requests
   * @returns {number} returns.expires_in - Token lifetime in seconds
   * 
   * @throws {Error} When authentication fails or network error occurs
   * 
   * @example
   * // Basic authentication
   * const { access_token, expires_in } = await tropiPayService.getAccessToken(
   *   process.env.TROPIPAY_CLIENT_ID,
   *   process.env.TROPIPAY_CLIENT_SECRET
   * );
   */
  async getAccessToken(clientId, clientSecret) {
    const response = await this.client.post('/access/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    };
  }

  /**
   * Get user profile information from TropiPay
   * 
   * Retrieves detailed user profile information including personal details,
   * verification status, and account settings. This is typically called after
   * successful authentication to get user context.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const profile = await tropiPayService.getUserProfile(accessToken);
   *   
   *   console.log(`Welcome, ${profile.firstName} ${profile.lastName}`);
   *   console.log(`Email: ${profile.email}`);
   *   console.log(`Phone: ${profile.phoneNumber}`);
   *   console.log(`Verified: ${profile.isVerified}`);
   *   console.log(`2FA Type: ${profile.twoFaType === 1 ? 'SMS' : 'Authenticator'}`);
   *   
   * } catch (error) {
   *   console.error('Failed to get profile:', error.message);
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE:
   * ```javascript
   * {
   *   id: "user_id",
   *   email: "user@example.com",
   *   firstName: "John",
   *   lastName: "Doe",
   *   phoneNumber: "+1234567890",
   *   isVerified: true,
   *   twoFaType: 1, // 1=SMS, 2=Google Authenticator
   *   country: "US",
   *   // ... other profile fields
   * }
   * ```
   * 
   * USE CASES:
   * - Display user information in UI
   * - Determine 2FA requirements for transfers
   * - Check verification status before high-value operations
   * - Personalize user experience
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @returns {Promise<Object>} User profile object with personal information
   * 
   * @throws {Error} When token is invalid or API request fails
   * 
   * @example
   * // Get profile and customize UI
   * const profile = await tropiPayService.getUserProfile(token);
   * if (profile.twoFaType === 2) {
   *   // User has Google Authenticator - show different 2FA UI
   *   showAuthenticatorInput();
   * } else {
   *   // User uses SMS - show SMS input
   *   showSMSInput();
   * }
   */
  async getUserProfile(accessToken) {
    const response = await this.client.get('/users/profile', {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  // ========== CUENTAS ==========

  /**
   * Get user's TropiPay accounts
   * 
   * Retrieves all accounts associated with the authenticated user. Each account
   * represents a currency wallet (USD, EUR, etc.) with balance information.
   * 
   * IMPORTANT: TropiPay API returns amounts in centavos (cents).
   * Use convertAccountsFromCentavos() to convert to standard currency units.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const rawAccounts = await tropiPayService.getAccounts(accessToken);
   *   const accounts = tropiPayService.convertAccountsFromCentavos(rawAccounts);
   *   
   *   accounts.forEach(account => {
   *     console.log(`${account.currency}: $${account.balance}`);
   *     console.log(`Available: $${account.available}`);
   *     console.log(`Pending In: $${account.pendingIn}`);
   *     console.log(`Pending Out: $${account.pendingOut}`);
   *   });
   *   
   * } catch (error) {
   *   console.error('Failed to get accounts:', error.message);
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE (after conversion):
   * ```javascript
   * [
   *   {
   *     id: "account_id",
   *     currency: "USD",
   *     balance: 1234.56,        // Total balance
   *     available: 1200.00,      // Available for transactions
   *     pendingIn: 50.00,        // Incoming pending amount
   *     pendingOut: 84.56        // Outgoing pending amount
   *   }
   * ]
   * ```
   * 
   * USE CASES:
   * - Display account balances in wallet UI
   * - Check available funds before transfers
   * - Show pending transactions
   * - Multi-currency account management
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @returns {Promise<Array>} Array of account objects with balance information
   * 
   * @throws {Error} When token is invalid or API request fails
   * 
   * @example
   * // Get accounts and check USD balance
   * const accounts = await tropiPayService.getAccounts(token);
   * const convertedAccounts = tropiPayService.convertAccountsFromCentavos(accounts);
   * const usdAccount = convertedAccounts.find(acc => acc.currency === 'USD');
   * 
   * if (usdAccount && usdAccount.available >= transferAmount) {
   *   // Sufficient funds available
   *   await processTransfer();
   * }
   */
  async getAccounts(accessToken) {
    const response = await this.client.get('/accounts/', {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  // ========== BENEFICIARIOS ==========

  /**
   * Get user's beneficiaries with pagination
   * 
   * Retrieves the list of saved beneficiaries (deposit accounts) for the user.
   * Beneficiaries are pre-saved recipient information for faster transfers.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   // Get first page of beneficiaries
   *   const beneficiaryData = await tropiPayService.getBeneficiaries(accessToken);
   *   const beneficiaries = beneficiaryData.rows || [];
   *   
   *   beneficiaries.forEach(beneficiary => {
   *     console.log(`${beneficiary.name}: ${beneficiary.accountNumber}`);
   *     console.log(`Bank: ${beneficiary.bankName}`);
   *     console.log(`Country: ${beneficiary.countryDestination}`);
   *   });
   *   
   *   // Check if there are more pages
   *   const totalCount = beneficiaryData.count;
   *   const hasMore = (offset + limit) < totalCount;
   *   
   * } catch (error) {
   *   console.error('Failed to get beneficiaries:', error.message);
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE:
   * ```javascript
   * {
   *   count: 25,           // Total number of beneficiaries
   *   rows: [              // Current page of beneficiaries
   *     {
   *       id: "beneficiary_id",
   *       name: "John Doe",
   *       accountNumber: "1234567890",
   *       bankName: "Bank of America",
   *       bankCode: "BAC",
   *       countryDestination: "US",
   *       accountType: "CHECKING"
   *       // ... other beneficiary fields
   *     }
   *   ]
   * }
   * ```
   * 
   * PAGINATION:
   * - offset: Starting index for results (0-based)
   * - limit: Maximum number of results per page (max 100)
   * - Use count field to determine total available records
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {number} [offset=0] - Starting index for pagination (0-based)
   * @param {number} [limit=20] - Maximum number of results (1-100)
   * @returns {Promise<Object>} Paginated beneficiaries response
   * @returns {number} returns.count - Total number of beneficiaries
   * @returns {Array} returns.rows - Array of beneficiary objects
   * 
   * @throws {Error} When token is invalid or API request fails
   * 
   * @example
   * // Get all beneficiaries with pagination
   * let allBeneficiaries = [];
   * let offset = 0;
   * const limit = 50;
   * 
   * do {
   *   const data = await tropiPayService.getBeneficiaries(token, offset, limit);
   *   allBeneficiaries.push(...data.rows);
   *   offset += limit;
   * } while (offset < data.count);
   */
  async getBeneficiaries(accessToken, offset = 0, limit = 20) {
    const response = await this.client.get('/deposit_accounts/', {
      headers: this.createAuthHeaders(accessToken),
      params: { offset, limit }
    });

    return response.data;
  }

  /**
   * Create a new beneficiary (deposit account)
   * 
   * Adds a new recipient to the user's saved beneficiaries list. This allows
   * for faster future transfers by pre-storing recipient information.
   * 
   * REQUIRED BENEFICIARY DATA:
   * - name: Recipient's full name
   * - accountNumber: Bank account number
   * - bankCode: Bank identifier code
   * - countryDestination: ISO country code (US, CA, etc.)
   * - accountType: Account type (CHECKING, SAVINGS)
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const beneficiaryData = {
   *   name: "John Doe",
   *   accountNumber: "1234567890",
   *   bankCode: "BAC",  // Bank of America code
   *   countryDestination: "US",
   *   accountType: "CHECKING",
   *   // Optional fields
   *   email: "john@example.com",
   *   phoneNumber: "+1234567890"
   * };
   * 
   * try {
   *   const beneficiary = await tropiPayService.createBeneficiary(
   *     accessToken, 
   *     beneficiaryData
   *   );
   *   
   *   console.log(`Beneficiary created with ID: ${beneficiary.id}`);
   *   
   *   // Refresh beneficiary list in your UI
   *   await refreshBeneficiaryList();
   *   
   * } catch (error) {
   *   if (error.response?.status === 400) {
   *     // Validation error - show user the specific field errors
   *     console.error('Validation errors:', error.response.data.errors);
   *   }
   * }
   * ```
   * 
   * VALIDATION REQUIREMENTS:
   * - Account numbers must be valid for the destination country
   * - Bank codes must exist in TropiPay's bank directory
   * - Names must match official account holder names
   * - Phone numbers must include country code
   * 
   * ERROR HANDLING:
   * - 400: Validation errors (invalid account number, bank code, etc.)
   * - 409: Duplicate beneficiary (already exists)
   * - 401: Invalid or expired token
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {Object} beneficiaryData - Beneficiary information object
   * @param {string} beneficiaryData.name - Full name of recipient
   * @param {string} beneficiaryData.accountNumber - Bank account number
   * @param {string} beneficiaryData.bankCode - Bank identifier code
   * @param {string} beneficiaryData.countryDestination - ISO country code
   * @param {string} beneficiaryData.accountType - Account type (CHECKING/SAVINGS)
   * @param {string} [beneficiaryData.email] - Recipient email (optional)
   * @param {string} [beneficiaryData.phoneNumber] - Recipient phone (optional)
   * @returns {Promise<Object>} Created beneficiary object with assigned ID
   * 
   * @throws {Error} When validation fails or API request fails
   * 
   * @example
   * // Create beneficiary with validation
   * try {
   *   // First validate account number
   *   await tropiPayService.validateAccountNumber(token, {
   *     accountNumber: beneficiaryData.accountNumber,
   *     bankCode: beneficiaryData.bankCode,
   *     countryDestination: beneficiaryData.countryDestination
   *   });
   *   
   *   // Then create beneficiary
   *   const beneficiary = await tropiPayService.createBeneficiary(token, beneficiaryData);
   * } catch (error) {
   *   // Handle validation or creation errors
   * }
   */
  async createBeneficiary(accessToken, beneficiaryData) {
    const response = await this.client.post('/deposit_accounts', beneficiaryData, {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  // ========== MOVIMIENTOS ==========

  /**
   * Get account movements (transaction history) with pagination
   * 
   * Retrieves the transaction history for a specific account, including
   * all incoming and outgoing transfers, deposits, and withdrawals.
   * 
   * IMPORTANT: Movement amounts are returned in centavos (cents).
   * Use convertMovementsFromCentavos() to convert to standard currency units.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const accountId = "your_account_id";
   *   const rawMovements = await tropiPayService.getAccountMovements(
   *     accessToken, 
   *     accountId, 
   *     0, 
   *     50
   *   );
   *   
   *   const movements = tropiPayService.convertMovementsFromCentavos(rawMovements);
   *   
   *   movements.rows.forEach(movement => {
   *     console.log(`${movement.createdAt}: ${movement.amount} ${movement.currency}`);
   *     console.log(`Type: ${movement.type} - ${movement.description}`);
   *     console.log(`Balance After: ${movement.balanceAfter}`);
   *   });
   *   
   * } catch (error) {
   *   console.error('Failed to get movements:', error.message);
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE (after conversion):
   * ```javascript
   * {
   *   count: 150,          // Total movements available
   *   rows: [              // Current page of movements
   *     {
   *       id: "movement_id",
   *       type: "TRANSFER_IN",  // TRANSFER_IN, TRANSFER_OUT, DEPOSIT, etc.
   *       amount: 100.50,      // Movement amount (converted)
   *       currency: "USD",
   *       balanceAfter: 1234.56,    // Account balance after this movement
   *       balanceBefore: 1134.06,   // Account balance before this movement
   *       description: "Transfer from John Doe",
   *       createdAt: "2024-01-15T10:30:00Z",
   *       status: "COMPLETED"
   *       // ... other movement fields
   *     }
   *   ]
   * }
   * ```
   * 
   * USE CASES:
   * - Display transaction history in wallet UI
   * - Generate account statements
   * - Track specific transaction status
   * - Audit and reconciliation purposes
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {string} accountId - Target account ID to get movements for
   * @param {number} [offset=0] - Starting index for pagination (0-based)
   * @param {number} [limit=20] - Maximum number of results (1-100)
   * @returns {Promise<Object>} Paginated movements response
   * @returns {number} returns.count - Total number of movements
   * @returns {Array} returns.rows - Array of movement objects
   * 
   * @throws {Error} When token is invalid, account not found, or API request fails
   * 
   * @example
   * // Get recent movements for primary USD account
   * const accounts = await tropiPayService.getAccounts(token);
   * const usdAccount = accounts.find(acc => acc.currency === 'USD');
   * 
   * if (usdAccount) {
   *   const movements = await tropiPayService.getAccountMovements(
   *     token, 
   *     usdAccount.id, 
   *     0, 
   *     10  // Last 10 transactions
   *   );
   * }
   */
  async getAccountMovements(accessToken, accountId, offset = 0, limit = 20) {
    const response = await this.client.get(`/accounts/${accountId}/movements`, {
      headers: this.createAuthHeaders(accessToken),
      params: { offset, limit }
    });

    return response.data;
  }

  // ========== TRANSFERENCIAS ==========

  /**
   * Simulate transfer (get quote and fees)
   * 
   * Simulates a transfer to calculate exact fees, exchange rates, and final
   * amounts without actually executing the transfer. This is REQUIRED before
   * executing any transfer to show users the exact costs.
   * 
   * IMPORTANT: Transfer amounts must be in centavos (cents).
   * Use prepareTransferData() to convert amounts before calling this method.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const transferData = {
   *     accountId: "source_account_id",
   *     destinationAccount: "beneficiary_id",
   *     amount: 100.00,  // Will be converted to centavos
   *     currency: "USD"
   *   };
   *   
   *   // Prepare data (converts to centavos)
   *   const preparedData = tropiPayService.prepareTransferData(transferData);
   *   
   *   // Simulate transfer
   *   const rawSimulation = await tropiPayService.simulateTransfer(
   *     accessToken, 
   *     preparedData
   *   );
   *   
   *   // Convert response back to standard units
   *   const simulation = tropiPayService.convertSimulationFromCentavos(rawSimulation);
   *   
   *   // Show user the quote
   *   console.log(`Amount to pay: ${simulation.amountToPay} ${simulation.currency}`);
   *   console.log(`Recipient gets: ${simulation.amountToGet} ${simulation.destinationCurrency}`);
   *   console.log(`Fees: ${simulation.fees}`);
   *   console.log(`Exchange rate: ${simulation.exchangeRate}`);
   *   console.log(`Your balance after: ${simulation.accountLeftBalance}`);
   *   
   * } catch (error) {
   *   console.error('Simulation failed:', error.message);
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE (after conversion):
   * ```javascript
   * {
   *   amountToPay: 100.00,        // Total amount to debit from account
   *   amountToGet: 95.50,         // Amount recipient will receive
   *   fees: 4.50,                 // Total fees charged
   *   exchangeRate: 0.85,         // Exchange rate (if currency conversion)
   *   currency: "USD",            // Source currency
   *   destinationCurrency: "EUR", // Destination currency
   *   accountLeftBalance: 900.00, // Account balance after transfer
   *   canExecute: true,           // Whether transfer can be executed
   *   requiresSMS: false          // Whether 2FA is required
   * }
   * ```
   * 
   * USE CASES:
   * - Show transfer preview to users
   * - Calculate exact fees and exchange rates
   * - Validate sufficient account balance
   * - Determine 2FA requirements
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {Object} transferData - Transfer details object (amounts in centavos)
   * @param {string} transferData.accountId - Source account ID
   * @param {string} transferData.destinationAccount - Beneficiary/destination ID
   * @param {number} transferData.amount - Transfer amount in centavos
   * @param {string} transferData.currency - Source currency code
   * @returns {Promise<Object>} Simulation result with fees and rates
   * 
   * @throws {Error} When insufficient funds, invalid beneficiary, or API request fails
   * 
   * @example
   * // Complete transfer simulation workflow
   * const transferAmount = 100.50;
   * const transferData = {
   *   accountId: sourceAccount.id,
   *   destinationAccount: selectedBeneficiary.id,
   *   amount: transferAmount,
   *   currency: "USD"
   * };
   * 
   * const preparedData = tropiPayService.prepareTransferData(transferData);
   * const simulation = await tropiPayService.simulateTransfer(token, preparedData);
   * const quote = tropiPayService.convertSimulationFromCentavos(simulation);
   * 
   * if (quote.canExecute) {
   *   // Show confirmation dialog with quote details
   *   showTransferConfirmation(quote);
   * }
   */
  async simulateTransfer(accessToken, transferData) {
    const response = await this.client.post('/booking/payout/simulate', transferData, {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  /**
   * Execute transfer (send money)
   * 
   * Executes a real money transfer to a beneficiary. This method processes
   * the actual transfer after simulation and user confirmation.
   * 
   * SECURITY REQUIREMENTS:
   * - Must simulate transfer first to show user exact amounts
   * - May require 2FA (SMS code or Google Authenticator)
   * - Transfer data must be identical to simulation data
   * 
   * IMPORTANT: Transfer amounts must be in centavos (cents).
   * Use prepareTransferData() to convert amounts before calling this method.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   // 1. First simulate (already done in previous step)
   *   const preparedData = tropiPayService.prepareTransferData(transferData);
   *   const simulation = await tropiPayService.simulateTransfer(token, preparedData);
   *   
   *   // 2. Get user confirmation
   *   const userConfirmed = await showTransferConfirmation(simulation);
   *   if (!userConfirmed) return;
   *   
   *   // 3. Handle 2FA if required
   *   if (simulation.requiresSMS) {
   *     const smsCode = await requestSMSAndGetCode();
   *     preparedData.smsCode = smsCode;
   *   }
   *   
   *   // 4. Execute transfer
   *   const rawResult = await tropiPayService.executeTransfer(token, preparedData);
   *   const result = tropiPayService.convertTransferResult(rawResult);
   *   
   *   console.log(`Transfer completed! ID: ${result.id}`);
   *   console.log(`Status: ${result.status}`);
   *   console.log(`Amount sent: ${result.amount}`);
   *   
   * } catch (error) {
   *   if (error.response?.status === 400) {
   *     console.error('Transfer validation failed:', error.response.data.message);
   *   } else if (error.response?.status === 402) {
   *     console.error('Insufficient funds');
   *   }
   * }
   * ```
   * 
   * RESPONSE DATA STRUCTURE (after conversion):
   * ```javascript
   * {
   *   id: "transfer_id",
   *   status: "PROCESSING",     // PROCESSING, COMPLETED, FAILED
   *   amount: 100.00,          // Transfer amount (converted)
   *   destinationAmount: 95.50, // Amount recipient receives
   *   currency: "USD",
   *   destinationCurrency: "EUR",
   *   fees: 4.50,
   *   createdAt: "2024-01-15T10:30:00Z",
   *   estimatedArrival: "2024-01-16T10:30:00Z",
   *   reference: "TRP123456789"
   * }
   * ```
   * 
   * ERROR HANDLING:
   * - 400: Validation error (invalid data, simulation mismatch)
   * - 401: Invalid or expired token
   * - 402: Insufficient funds
   * - 403: 2FA required or invalid 2FA code
   * - 404: Beneficiary not found
   * - 422: Transfer limits exceeded
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {Object} transferData - Transfer details object (amounts in centavos)
   * @param {string} transferData.accountId - Source account ID
   * @param {string} transferData.destinationAccount - Beneficiary/destination ID
   * @param {number} transferData.amount - Transfer amount in centavos
   * @param {string} transferData.currency - Source currency code
   * @param {string} [transferData.smsCode] - SMS 2FA code (if required)
   * @param {string} [transferData.googleAuthCode] - Google Authenticator code (if required)
   * @returns {Promise<Object>} Transfer execution result
   * 
   * @throws {Error} When transfer fails, insufficient funds, or validation errors
   * 
   * @example
   * // Complete transfer execution with 2FA
   * const transferData = { 
   *   accountId: "123",
   *   destinationAccount: "456", 
   *   amount: 10000,
   *   currency: "USD"
   * };
   * const preparedData = tropiPayService.prepareTransferData(transferData);
   * 
   * // Check if 2FA is needed
   * const simulation = await tropiPayService.simulateTransfer(token, preparedData);
   * 
   * if (simulation.requiresSMS && userProfile.twoFaType === 1) {
   *   // Request SMS code
   *   await tropiPayService.requestSMSCode(token, userProfile.phoneNumber);
   *   const smsCode = await getUserSMSCode();
   *   preparedData.smsCode = smsCode;
   * }
   * 
   * const result = await tropiPayService.executeTransfer(token, preparedData);
   */
  async executeTransfer(accessToken, transferData) {
    const response = await this.client.post('/booking/payout', transferData, {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  // ========== 2FA ==========

  /**
   * Request SMS code for 2FA authentication
   * 
   * Sends an SMS verification code to the user's phone number for two-factor
   * authentication during transfers or other sensitive operations.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const phoneNumber = userProfile.phoneNumber;
   *   const result = await tropiPayService.requestSMSCode(accessToken, phoneNumber);
   *   
   *   console.log('SMS sent successfully:', result.message);
   *   
   *   // Show SMS input dialog to user
   *   const smsCode = await showSMSInputDialog();
   *   
   *   // Use SMS code in transfer execution
   *   transferData.smsCode = smsCode;
   *   
   * } catch (error) {
   *   console.error('Failed to send SMS:', error.message);
   * }
   * ```
   * 
   * WHEN TO USE:
   * - User profile has twoFaType === 1 (SMS authentication)
   * - Before executing high-value transfers
   * - When simulation result indicates requiresSMS: true
   * - For account security changes
   * 
   * RESPONSE DATA STRUCTURE:
   * ```javascript
   * {
   *   message: "SMS sent successfully",
   *   success: true,
   *   expiresIn: 300  // Code expires in 5 minutes
   * }
   * ```
   * 
   * ERROR HANDLING:
   * - 400: Invalid phone number format
   * - 429: Too many SMS requests (rate limited)
   * - 401: Invalid or expired token
   * 
   * @param {string} accessToken - Valid TropiPay access token
   * @param {string} phoneNumber - User's phone number with country code (e.g., +1234567890)
   * @returns {Promise<Object>} SMS request confirmation
   * 
   * @throws {Error} When phone number is invalid or SMS service fails
   * 
   * @example
   * // 2FA workflow for transfers
   * const userProfile = await tropiPayService.getUserProfile(token);
   * 
   * if (userProfile.twoFaType === 1) {
   *   // User uses SMS 2FA
   *   await tropiPayService.requestSMSCode(token, userProfile.phoneNumber);
   *   const smsCode = await getUserInput('Enter SMS code:');
   *   // Use smsCode in transfer execution
   * } else if (userProfile.twoFaType === 2) {
   *   // User uses Google Authenticator
   *   const authCode = await getUserInput('Enter authenticator code:');
   *   // Use authCode in transfer execution
   * }
   */
  async requestSMSCode(accessToken, phoneNumber) {
    const response = await this.client.post('/users/sendSecurityCode', {
      phoneNumber: phoneNumber,
      type: 1  // 1 for SMS, 2 for Authenticator
    }, {
      headers: this.createAuthHeaders(accessToken)
    });

    return response.data;
  }

  // ========== UTILIDADES ==========

  /**
   * Convert amount from standard currency units to centavos (cents)
   * 
   * TropiPay API requires all amounts to be sent in centavos. This utility
   * converts standard currency amounts (e.g., 10.50 USD) to centavos (1050).
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const userAmount = 100.50;  // $100.50 USD
   * const centavos = tropiPayService.convertToCentavos(userAmount);
   * console.log(centavos);  // 10050
   * 
   * // Use in transfer data
   * const transferData = {
   *   amount: tropiPayService.convertToCentavos(transferAmount),
   *   // ... other fields
   * };
   * ```
   * 
   * IMPORTANT NOTES:
   * - Uses Math.round() to handle floating-point precision issues
   * - Handles null/undefined amounts by returning 0
   * - Always use this before sending amounts to TropiPay API
   * 
   * @param {number} amount - Amount in standard currency units (e.g., 10.50)
   * @returns {number} Amount in centavos (e.g., 1050)
   * 
   * @example
   * // Convert various amounts
   * const amounts = [0, 10, 10.5, 10.55, 10.556];
   * amounts.forEach(amount => {
   *   console.log(`${amount} -> ${tropiPayService.convertToCentavos(amount)} centavos`);
   * });
   * // 0 -> 0 centavos
   * // 10 -> 1000 centavos
   * // 10.5 -> 1050 centavos
   * // 10.55 -> 1055 centavos
   * // 10.556 -> 1056 centavos (rounded)
   */
  convertToCentavos(amount) {
    return Math.round((amount || 0) * 100);
  }

  /**
   * Convert amount from centavos (cents) to standard currency units
   * 
   * TropiPay API returns all amounts in centavos. This utility converts
   * centavos back to standard currency units for display to users.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * // API returns balance in centavos
   * const balanceInCentavos = 125050;  // From API
   * const balance = tropiPayService.convertFromCentavos(balanceInCentavos);
   * console.log(`Balance: $${balance.toFixed(2)}`);  // Balance: $1250.50
   * 
   * // Display amounts in UI
   * const displayAmount = tropiPayService.convertFromCentavos(apiAmount);
   * ```
   * 
   * IMPORTANT NOTES:
   * - Handles null/undefined amounts by returning 0
   * - Always use this when displaying amounts from TropiPay API
   * - Use .toFixed(2) for proper currency display formatting
   * 
   * @param {number} amount - Amount in centavos (e.g., 1050)
   * @returns {number} Amount in standard currency units (e.g., 10.50)
   * 
   * @example
   * // Convert API responses for display
   * const apiResponse = {
   *   balance: 125050,        // 1250.50 USD in centavos
   *   pendingIn: 5000,        // 50.00 USD in centavos
   *   pendingOut: 2500        // 25.00 USD in centavos
   * };
   * 
   * const displayData = {
   *   balance: tropiPayService.convertFromCentavos(apiResponse.balance),
   *   pendingIn: tropiPayService.convertFromCentavos(apiResponse.pendingIn),
   *   pendingOut: tropiPayService.convertFromCentavos(apiResponse.pendingOut)
   * };
   * 
   * console.log(`Balance: $${displayData.balance.toFixed(2)}`);
   */
  convertFromCentavos(amount) {
    return (amount || 0) / 100;
  }

  /**
   * Convert accounts array from centavos to standard currency units
   * 
   * Converts all monetary fields in an accounts array from TropiPay API
   * (which are in centavos) to standard currency units for display.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * // Get accounts from API (amounts in centavos)
   * const rawAccounts = await tropiPayService.getAccounts(accessToken);
   * 
   * // Convert for display in UI
   * const accounts = tropiPayService.convertAccountsFromCentavos(rawAccounts);
   * 
   * accounts.forEach(account => {
   *   console.log(`${account.currency} Account:`);
   *   console.log(`  Balance: $${account.balance.toFixed(2)}`);
   *   console.log(`  Available: $${account.available.toFixed(2)}`);
   *   console.log(`  Pending In: $${account.pendingIn.toFixed(2)}`);
   *   console.log(`  Pending Out: $${account.pendingOut.toFixed(2)}`);
   * });
   * ```
   * 
   * CONVERTED FIELDS:
   * - balance: Total account balance
   * - pendingIn: Incoming pending transactions
   * - pendingOut: Outgoing pending transactions  
   * - available: Available balance for transactions (same as balance)
   * 
   * @param {Array} accounts - Array of account objects from TropiPay API
   * @returns {Array} Array of account objects with converted monetary values
   * 
   * @example
   * // Complete account display workflow
   * const rawAccounts = await tropiPayService.getAccounts(token);
   * const accounts = tropiPayService.convertAccountsFromCentavos(rawAccounts);
   * 
   * // Display in wallet UI
   * const accountsDisplay = accounts.map(account => ({
   *   ...account,
   *   balanceFormatted: `$${account.balance.toFixed(2)}`,
   *   availableFormatted: `$${account.available.toFixed(2)}`
   * }));
   */
  convertAccountsFromCentavos(accounts) {
    if (!Array.isArray(accounts)) return [];
    
    return accounts.map(account => ({
      ...account,
      balance: this.convertFromCentavos(account.balance),
      pendingIn: this.convertFromCentavos(account.pendingIn),
      pendingOut: this.convertFromCentavos(account.pendingOut),
      available: this.convertFromCentavos(account.balance) // Compatibility field
    }));
  }

  /**
   * Convertir movimientos de centavos a unidades principales
   */
  convertMovementsFromCentavos(movementsData) {
    if (!movementsData || !movementsData.rows) {
      return movementsData;
    }
    
    return {
      ...movementsData,
      rows: movementsData.rows.map(movement => ({
        ...movement,
        amount: this.convertFromCentavos(movement.amount),
        balanceAfter: this.convertFromCentavos(movement.balanceAfter),
        balanceBefore: this.convertFromCentavos(movement.balanceBefore),
        destinationAmount: movement.destinationAmount ? this.convertFromCentavos(parseFloat(movement.destinationAmount)) : 0,
        originalCurrencyAmount: movement.originalCurrencyAmount ? this.convertFromCentavos(parseFloat(movement.originalCurrencyAmount)) : 0
      }))
    };
  }

  /**
   * Convertir datos de simulación de transferencia
   */
  convertSimulationFromCentavos(simulationData) {
    return {
      ...simulationData,
      amountToPay: this.convertFromCentavos(simulationData.amountToPay),
      amountToGet: this.convertFromCentavos(simulationData.amountToGet),
      amountToGetInEUR: this.convertFromCentavos(simulationData.amountToGetInEUR),
      fees: this.convertFromCentavos(simulationData.fees),
      accountLeftBalance: this.convertFromCentavos(simulationData.accountLeftBalance)
    };
  }

  /**
   * Prepare transfer data for API submission (convert to centavos)
   * 
   * Converts transfer data from user-friendly units to the centavos format
   * required by TropiPay API. This is essential before calling simulateTransfer
   * or executeTransfer methods.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * // User input data (standard currency units)
   * const transferData = {
   *   accountId: "source_account_id",
   *   destinationAccount: "beneficiary_id",
   *   amount: 100.50,           // $100.50 USD
   *   currency: "USD",
   *   description: "Payment for services"
   * };
   * 
   * // Prepare for API (converts amounts to centavos)
   * const preparedData = tropiPayService.prepareTransferData(transferData);
   * console.log(preparedData.amount);  // 10050 (centavos)
   * 
   * // Now ready for API calls 
   * const simulation = await tropiPayService.simulateTransfer(token, preparedData);
   * ```
   * 
   * CONVERTED FIELDS:
   * - amount: Main transfer amount converted to centavos
   * - amountToPay: Total amount to pay (if different from amount)
   * - destinationAmount: Specific destination amount (if provided)
   * 
   * IMPORTANT NOTES:
   * - Always use this method before calling transfer-related API methods
   * - Handles both 'amount' and 'amountToPay' field variations
   * - Preserves all other transfer data fields unchanged
   * 
   * @param {Object} transferData - Transfer data with standard currency amounts
   * @param {number} transferData.amount - Transfer amount in standard units
   * @param {number} [transferData.amountToPay] - Alternative amount field
   * @param {number} [transferData.destinationAmount] - Specific destination amount
   * @returns {Object} Transfer data with amounts converted to centavos
   * 
   * @example
   * // Complete transfer preparation workflow
   * const userTransfer = {
   *   accountId: selectedAccount.id,
   *   destinationAccount: selectedBeneficiary.id,
   *   amount: parseFloat(userAmountInput),  // 250.75
   *   currency: "USD",
   *   reference: "Invoice #12345"
   * };
   * 
   * const apiReadyData = tropiPayService.prepareTransferData(userTransfer);
   * // apiReadyData.amount is now 25075 (centavos)
   */
  prepareTransferData(transferData) {
    return {
      ...transferData,
      amountToPay: this.convertToCentavos(transferData.amountToPay || transferData.amount),
      amount: this.convertToCentavos(transferData.amount || transferData.amountToPay),
      destinationAmount: transferData.destinationAmount ? this.convertToCentavos(transferData.destinationAmount) : undefined
    };
  }

  /**
   * Convertir resultado de transferencia
   */
  convertTransferResult(transferResult) {
    return {
      ...transferResult,
      amount: transferResult.amount ? this.convertFromCentavos(transferResult.amount) : transferResult.amount,
      destinationAmount: transferResult.destinationAmount ? this.convertFromCentavos(transferResult.destinationAmount) : transferResult.destinationAmount
    };
  }

  // ========== BENEFICIARIOS ==========

  /**
   * Crear beneficiario usando la API correcta de TropiPay
   */
  async createBeneficiary(accessToken, beneficiaryData) {
    const response = await this.client.post('/deposit_accounts', beneficiaryData, {
      headers: this.createAuthHeaders(accessToken)
    });
    return response.data;
  }

  /**
   * Validar número de cuenta
   */
  async validateAccountNumber(accessToken, validationData) {
    const response = await this.client.post('/deposit_accounts/validate_account_number', validationData, {
      headers: this.createAuthHeaders(accessToken)
    });
    return response.data;
  }

  /**
   * Validar código SWIFT
   */
  async validateSwiftCode(accessToken, validationData) {
    const response = await this.client.post('/deposit_accounts/Validate_Swift', validationData, {
      headers: this.createAuthHeaders(accessToken)
    });
    return response.data;
  }
}

/**
 * Export singleton instance of TropiPayService
 * 
 * This singleton pattern ensures consistent API client configuration and
 * environment management across your entire application.
 * 
 * CLIENT INTEGRATION USAGE:
 * ```javascript
 * // Import the service anywhere in your application
 * const tropiPayService = require('./services/tropiPayService');
 * 
 * // All service methods are available
 * const token = await tropiPayService.getAccessToken(clientId, clientSecret);
 * const accounts = await tropiPayService.getAccounts(token.access_token);
 * ```
 * 
 * KEY INTEGRATION PATTERNS:
 * 
 * 1. Authentication Flow:
 * ```javascript
 * const { access_token } = await tropiPayService.getAccessToken(id, secret);
 * const profile = await tropiPayService.getUserProfile(access_token);
 * ```
 * 
 * 2. Account Management:
 * ```javascript
 * const rawAccounts = await tropiPayService.getAccounts(token);
 * const accounts = tropiPayService.convertAccountsFromCentavos(rawAccounts);
 * ```
 * 
 * 3. Transfer Processing:
 * ```javascript
 * const prepared = tropiPayService.prepareTransferData(transferData);
 * const simulation = await tropiPayService.simulateTransfer(token, prepared);
 * const converted = tropiPayService.convertSimulationFromCentavos(simulation);
 * const result = await tropiPayService.executeTransfer(token, prepared);
 * ```
 * 
 * 4. Environment Management:
 * ```javascript
 * tropiPayService.switchEnvironment('production'); // For live transactions
 * tropiPayService.switchEnvironment('development'); // For testing
 * ```
 * 
 * BEST PRACTICES:
 * - Always simulate transfers before execution
 * - Handle currency conversion with provided utilities
 * - Implement proper error handling for all API calls
 * - Store and refresh access tokens appropriately
 * - Use environment switching for testing vs production
 * 
 * @type {TropiPayService} Singleton service instance
 */
module.exports = new TropiPayService();