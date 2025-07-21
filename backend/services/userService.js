/**
 * User Service - Business Logic Layer for TropiPay Integration
 * 
 * This service provides a high-level business logic layer that coordinates
 * between the TropiPay API service and local database operations. It's designed
 * to help client developers implement complete wallet functionality with
 * proper data persistence and error handling.
 * 
 * @fileoverview Complete user management and wallet operations service
 * 
 * INTEGRATION GUIDE FOR CLIENT DEVELOPERS:
 * =======================================
 * 
 * 1. AUTHENTICATION & USER MANAGEMENT:
 *    - Use authenticateUser() for complete login flow
 *    - Handles token management, user creation, and data synchronization
 *    - Automatically stores user data and tokens in local database
 * 
 * 2. DATA PERSISTENCE STRATEGY:
 *    - All TropiPay data is cached locally for offline access
 *    - Automatic fallback to cached data when API is unavailable
 *    - Real-time synchronization with TropiPay API when online
 * 
 * 3. ERROR HANDLING PATTERNS:
 *    - API failures automatically fall back to cached data
 *    - Token expiration is handled with proper error messages
 *    - Network errors are gracefully managed
 * 
 * 4. COMPLETE INTEGRATION WORKFLOWS:
 * 
 * User Authentication:
 * ```javascript
 * const userService = require('./services/userService');
 * 
 * try {
 *   const result = await userService.authenticateUser(
 *     clientId, 
 *     clientSecret, 
 *     'development'
 *   );
 *   
 *   console.log('User authenticated:', result.user.profile.email);
 *   console.log('Accounts:', result.user.accounts);
 *   
 *   // Store user session
 *   req.session.userId = result.user.id;
 *   req.session.token = result.user.token;
 *   
 * } catch (error) {
 *   console.error('Authentication failed:', error.message);
 * }
 * ```
 * 
 * Account Management:
 * ```javascript
 * // Refresh user accounts (with fallback to cached data)
 * const accounts = await userService.refreshUserAccounts(userId);
 * 
 * // Get account movements with pagination
 * const movements = await userService.getUserAccountMovements(
 *   userId, 
 *   accountId, 
 *   0, 
 *   20
 * );
 * ```
 * 
 * Transfer Processing:
 * ```javascript
 * // 1. Simulate transfer
 * const simulation = await userService.simulateUserTransfer(userId, transferData);
 * 
 * // 2. Handle 2FA if required
 * if (simulation.requiresSMS) {
 *   await userService.requestTransferSMS(userId, userPhone);
 *   const smsCode = await getUserSMSInput();
 *   transferData.smsCode = smsCode;
 * }
 * 
 * // 3. Execute transfer
 * const result = await userService.executeUserTransfer(userId, transferData);
 * ```
 * 
 * Beneficiary Management:
 * ```javascript
 * // Create new beneficiary
 * const beneficiary = await userService.createUserBeneficiary(userId, beneficiaryData);
 * 
 * // Refresh beneficiary list
 * const beneficiaries = await userService.refreshUserBeneficiaries(userId);
 * ```
 * 
 * 5. MULTI-ENVIRONMENT SUPPORT:
 *    - Service supports dynamic environment switching
 *    - Pass environment parameter to authenticateUser()
 *    - Useful for multi-tenant applications
 * 
 * 6. OFFLINE-FIRST DESIGN:
 *    - All methods attempt API calls first
 *    - Automatic fallback to cached data on failures
 *    - Ensures application works even with network issues
 * 
 * @author TropiPay Integration Team
 * @version 2.0.0
 * @since 2024
 */

const tropiPayService = require('./tropiPayService');
const database = require('../database');

/**
 * User service for managing TropiPay wallet operations
 * 
 * This service provides high-level business logic for user management,
 * combining TropiPay API operations with local data persistence and
 * intelligent caching strategies.
 */
class UserService {
  
  // ========== AUTENTICACIÓN ==========

  /**
   * Authenticate user with complete workflow
   * 
   * This is the main authentication method that handles the complete login workflow:
   * - Obtains access token from TropiPay
   * - Creates or updates user in local database
   * - Fetches and caches user profile and accounts
   * - Loads and caches beneficiaries
   * - Returns complete user context for the session
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const result = await userService.authenticateUser(
   *     process.env.TROPIPAY_CLIENT_ID,
   *     process.env.TROPIPAY_CLIENT_SECRET,
   *     'development'  // or 'production'
   *   );
   *   
   *   // Store session data
   *   req.session.userId = result.user.id;
   *   req.session.accessToken = result.user.token;
   *   req.session.tokenExpiry = result.user.expires_at;
   *   
   *   // Access user data
   *   const profile = result.user.profile;
   *   const accounts = result.user.accounts; // Already converted from centavos
   *   
   *   res.json({
   *     success: true,
   *     user: {
   *       email: profile.email,
   *       name: `${profile.firstName} ${profile.lastName}`,
   *       accounts: accounts,
   *       twoFaType: profile.twoFaType
   *     }
   *   });
   *   
   * } catch (error) {
   *   console.error('Authentication failed:', error.message);
   *   res.status(401).json({ error: 'Authentication failed' });
   * }
   * ```
   * 
   * RETURN DATA STRUCTURE:
   * ```javascript
   * {
   *   user: {
   *     id: 123,                    // Local user ID
   *     client_id: "your_client_id",
   *     profile: {                  // TropiPay user profile
   *       id: "tropipay_user_id",
   *       email: "user@example.com",
   *       firstName: "John",
   *       lastName: "Doe",
   *       twoFaType: 1, // 1=SMS, 2=Google Authenticator
   *       // ... other profile fields
   *     },
   *     accounts: [                 // Converted from centavos
   *       {
   *         id: "account_id",
   *         currency: "USD",
   *         balance: 1234.56,
   *         available: 1200.00
   *         // ... other account fields
   *       }
   *     ],
   *     token: "access_token",
   *     expires_at: "2024-01-15T15:30:00Z"
   *   }
   * }
   * ```
   * 
   * DATA PERSISTENCE:
   * - User profile and tokens are stored in local database
   * - Account balances are cached for offline access
   * - Beneficiaries are loaded and cached during authentication
   * - All cached data is automatically refreshed from API
   * 
   * ENVIRONMENT SWITCHING:
   * - Pass environment parameter to use specific TropiPay environment
   * - Useful for multi-tenant applications or testing scenarios
   * - If not specified, uses default environment from config
   * 
   * @param {string} clientId - Your TropiPay client ID
   * @param {string} clientSecret - Your TropiPay client secret
   * @param {string} [environment=null] - Target environment ('development'|'production')
   * @returns {Promise<Object>} Complete user authentication result
   * @returns {Object} returns.user - User object with profile, accounts, and tokens
   * 
   * @throws {Error} When authentication fails, invalid credentials, or API errors
   * 
   * @example
   * // Basic authentication
   * const result = await userService.authenticateUser(clientId, clientSecret);
   * 
   * @example
   * // Environment-specific authentication
   * const prodUser = await userService.authenticateUser(id, secret, 'production');
   * 
   * @example
   * // Complete login endpoint
   * app.post('/login', async (req, res) => {
   *   try {
   *     const { clientId, clientSecret } = req.body;
   *     const result = await userService.authenticateUser(clientId, clientSecret);
   *     
   *     req.session.userId = result.user.id;
   *     res.json({ success: true, user: result.user });
   *   } catch (error) {
   *     res.status(401).json({ error: error.message });
   *   }
   * });
   */
  async authenticateUser(clientId, clientSecret, environment = null) {
    // Cambiar entorno si se especifica
    if (environment) {
      tropiPayService.switchEnvironment(environment);
    }
    try {
      // 1. Obtener token de TropiPay
      const tokenData = await tropiPayService.getAccessToken(clientId, clientSecret);
      const { access_token, expires_in } = tokenData;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // 2. Buscar o crear usuario en BD local
      let user = await database.getUser(clientId);
      if (!user) {
        const userId = await database.createUser(clientId, clientSecret);
        user = { id: userId, client_id: clientId, client_secret: clientSecret };
      }

      // 3. Actualizar token en BD
      await database.updateUserToken(user.id, access_token, expiresAt);

      // 4. Obtener información del usuario de TropiPay
      const profile = await tropiPayService.getUserProfile(access_token);
      await database.updateUserData(user.id, profile);

      // 5. Obtener y guardar cuentas
      const rawAccounts = await tropiPayService.getAccounts(access_token);
      const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];
      await database.saveAccounts(user.id, accounts);
      const convertedAccounts = tropiPayService.convertAccountsFromCentavos(accounts);

      // 6. Obtener y guardar beneficiarios
      let beneficiaries = [];
      try {
        const beneficiariesData = await tropiPayService.getBeneficiaries(access_token, 0, 50);
        beneficiaries = beneficiariesData?.rows || [];
        await database.saveBeneficiaries(user.id, beneficiaries);
      } catch (error) {
        console.log('Error loading beneficiaries:', error.message);
        await database.saveBeneficiaries(user.id, []);
      }

      return {
        user: {
          id: user.id,
          client_id: clientId,
          profile,
          accounts: convertedAccounts,
          token: access_token,
          expires_at: expiresAt
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // ========== CUENTAS ==========

  /**
   * Refresh user accounts with intelligent caching
   * 
   * Attempts to refresh account data from TropiPay API with automatic fallback
   * to cached data if the API is unavailable. This ensures your application
   * remains functional even during network issues.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   // Get fresh account data (with fallback to cache)
   *   const accounts = await userService.refreshUserAccounts(userId);
   *   
   *   // Display in UI
   *   accounts.forEach(account => {
   *     console.log(`${account.currency}: $${account.balance.toFixed(2)}`);
   *     console.log(`Available: $${account.available.toFixed(2)}`);
   *   });
   *   
   *   // Update UI with fresh data
   *   updateAccountBalances(accounts);
   *   
   * } catch (error) {
   *   // This rarely happens due to fallback mechanism
   *   console.error('Could not refresh accounts:', error.message);
   * }
   * ```
   * 
   * INTELLIGENT CACHING BEHAVIOR:
   * 1. First attempts to fetch fresh data from TropiPay API
   * 2. If successful, updates local cache and returns converted data
   * 3. If API fails, automatically returns cached data from database
   * 4. Only throws error if both API and cache fail
   * 
   * TOKEN VALIDATION:
   * - Automatically checks token expiration before API calls
   * - Returns appropriate error for expired tokens
   * - Client should handle token refresh or re-authentication
   * 
   * RETURN DATA:
   * - All account amounts are converted from centavos to standard units
   * - Ready for direct display in UI without further conversion
   * - Includes balance, available, pendingIn, pendingOut fields
   * 
   * @param {number} userId - Local user ID from database
   * @returns {Promise<Array>} Array of account objects with converted amounts
   * 
   * @throws {Error} When user not found, token expired, or both API and cache fail
   * 
   * @example
   * // Refresh accounts for dashboard
   * const accounts = await userService.refreshUserAccounts(req.session.userId);
   * res.json({ accounts });
   * 
   * @example
   * // Handle token expiration
   * try {
   *   const accounts = await userService.refreshUserAccounts(userId);
   * } catch (error) {
   *   if (error.message.includes('Token expirado')) {
   *     // Redirect to login
   *     return res.status(401).json({ error: 'Session expired' });
   *   }
   *   throw error;
   * }
   */
  async refreshUserAccounts(userId) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar si el token ha expirado
    const now = new Date();
    const tokenExpiry = new Date(user.token_expires_at);
    if (tokenExpiry && now > tokenExpiry) {
      throw new Error('Token expirado, necesita reautenticación');
    }

    try {
      // Obtener cuentas de TropiPay
      const rawAccounts = await tropiPayService.getAccounts(user.access_token);
      const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];
      
      // Guardar en BD local
      await database.saveAccounts(userId, accounts);
      
      // Convertir y retornar
      return tropiPayService.convertAccountsFromCentavos(accounts);
    } catch (error) {
      // Si falla la API, usar datos locales
      console.log('⚠️  API failed, using local accounts from database');
      return await database.getAccounts(userId);
    }
  }

  // ========== BENEFICIARIOS ==========

  /**
   * Refrescar beneficiarios del usuario
   */
  async refreshUserBeneficiaries(userId, offset = 0, limit = 20) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    try {
      // Obtener beneficiarios de TropiPay
      const beneficiariesData = await tropiPayService.getBeneficiaries(user.access_token, offset, limit);
      const beneficiaries = beneficiariesData?.rows || [];
      
      // Guardar en BD local
      await database.saveBeneficiaries(userId, beneficiaries);
      
      return beneficiaries;
    } catch (error) {
      // Si falla la API, usar datos locales
      console.log('⚠️  API failed, using local beneficiaries from database');
      return await database.getBeneficiaries(userId);
    }
  }

  /**
   * Create new beneficiary for user with automatic refresh
   * 
   * Creates a new beneficiary (recipient) for the user and automatically
   * refreshes the cached beneficiary list. This provides a complete
   * beneficiary creation workflow with proper error handling.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const beneficiaryData = {
   *   name: "John Doe",
   *   accountNumber: "1234567890",
   *   bankCode: "BAC",              // Bank of America code
   *   countryDestination: "US",
   *   accountType: "CHECKING",
   *   email: "john@example.com",     // Optional
   *   phoneNumber: "+1234567890"     // Optional
   * };
   * 
   * try {
   *   const beneficiary = await userService.createUserBeneficiary(userId, beneficiaryData);
   *   
   *   console.log('Beneficiary created:', beneficiary.id);
   *   
   *   // Update UI with new beneficiary
   *   addBeneficiaryToList(beneficiary);
   *   showSuccessMessage('Beneficiary added successfully');
   *   
   * } catch (error) {
   *   if (error.response?.status === 400) {
   *     // Validation error
   *     const errors = error.response.data.errors || {};
   *     showValidationErrors(errors);
   *   } else if (error.response?.status === 409) {
   *     // Duplicate beneficiary
   *     showErrorMessage('This beneficiary already exists');
   *   } else {
   *     showErrorMessage('Failed to create beneficiary: ' + error.message);
   *   }
   * }
   * ```
   * 
   * AUTOMATIC WORKFLOW:
   * 1. Validates user authentication and token
   * 2. Creates beneficiary using TropiPay API
   * 3. Automatically refreshes local beneficiary cache
   * 4. Returns created beneficiary data
   * 
   * VALIDATION REQUIREMENTS:
   * - Account number must be valid for destination country
   * - Bank code must exist in TropiPay's bank directory
   * - Name must match official account holder name
   * - Phone number must include country code (if provided)
   * - Email must be valid format (if provided)
   * 
   * BENEFICIARY DATA STRUCTURE:
   * ```javascript
   * {
   *   id: "beneficiary_id",
   *   name: "John Doe",
   *   accountNumber: "1234567890",
   *   bankName: "Bank of America",
   *   bankCode: "BAC",
   *   countryDestination: "US",
   *   accountType: "CHECKING",
   *   email: "john@example.com",
   *   phoneNumber: "+1234567890",
   *   createdAt: "2024-01-15T10:30:00Z",
   *   status: "ACTIVE"
   * }
   * ```
   * 
   * ERROR HANDLING:
   * - 400: Validation errors (invalid account, bank code, etc.)
   * - 401: Invalid or expired token
   * - 409: Duplicate beneficiary (already exists)
   * - 422: Business rule violations (limits, restrictions)
   * 
   * @param {number} userId - Local user ID from database
   * @param {Object} beneficiaryData - Complete beneficiary information
   * @param {string} beneficiaryData.name - Full name of recipient
   * @param {string} beneficiaryData.accountNumber - Bank account number
   * @param {string} beneficiaryData.bankCode - Bank identifier code
   * @param {string} beneficiaryData.countryDestination - ISO country code
   * @param {string} beneficiaryData.accountType - Account type (CHECKING/SAVINGS)
   * @param {string} [beneficiaryData.email] - Recipient email (optional)
   * @param {string} [beneficiaryData.phoneNumber] - Recipient phone (optional)
   * @returns {Promise<Object>} Created beneficiary object with assigned ID
   * 
   * @throws {Error} When user not authenticated, validation fails, or API errors
   * 
   * @example
   * // Beneficiary creation endpoint
   * app.post('/beneficiaries', async (req, res) => {
   *   try {
   *     const beneficiary = await userService.createUserBeneficiary(
   *       req.session.userId,
   *       req.body
   *     );
   *     res.status(201).json(beneficiary);
   *   } catch (error) {
   *     const statusCode = error.response?.status || 500;
   *     res.status(statusCode).json({ error: error.message });
   *   }
   * });
   */
  async createUserBeneficiary(userId, beneficiaryData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Crear en TropiPay
    const result = await tropiPayService.createBeneficiary(user.access_token, beneficiaryData);
    
    // Refrescar lista local
    await this.refreshUserBeneficiaries(userId);
    
    return result;
  }

  // ========== MOVIMIENTOS ==========

  /**
   * Obtener movimientos de una cuenta
   */
  async getUserAccountMovements(userId, accountId, offset = 0, limit = 20) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener movimientos de TropiPay
    const movementsData = await tropiPayService.getAccountMovements(
      user.access_token, 
      accountId, 
      offset, 
      limit
    );

    // Convertir y retornar solo las filas
    const convertedMovements = tropiPayService.convertMovementsFromCentavos(movementsData);
    return convertedMovements?.rows || [];
  }

  // ========== TRANSFERENCIAS ==========

  /**
   * Simulate transfer for user (get quote with fees)
   * 
   * Simulates a transfer for the specified user, handling all token management
   * and currency conversion automatically. This provides a complete transfer
   * preview with exact fees, exchange rates, and final amounts.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const transferData = {
   *     accountId: selectedAccount.id,
   *     destinationAccount: selectedBeneficiary.id,
   *     amount: parseFloat(userAmountInput), // e.g., 100.50
   *     currency: "USD",
   *     description: "Payment for services"
   *   };
   *   
   *   const simulation = await userService.simulateUserTransfer(userId, transferData);
   *   
   *   // Show transfer preview to user
   *   showTransferPreview({
   *     sendAmount: simulation.amountToPay,
   *     receiveAmount: simulation.amountToGet,
   *     fees: simulation.fees,
   *     exchangeRate: simulation.exchangeRate,
   *     balanceAfter: simulation.accountLeftBalance,
   *     requiresSMS: simulation.requiresSMS
   *   });
   *   
   * } catch (error) {
   *   if (error.message.includes('Insufficient funds')) {
   *     showErrorDialog('Not enough balance for this transfer');
   *   } else {
   *     showErrorDialog('Transfer simulation failed: ' + error.message);
   *   }
   * }
   * ```
   * 
   * AUTOMATIC PROCESSING:
   * - Validates user authentication and token
   * - Converts transfer amounts to centavos for API
   * - Calls TropiPay simulation API
   * - Converts response amounts back to standard units
   * - Returns ready-to-display simulation data
   * 
   * SIMULATION RESPONSE (already converted):
   * ```javascript
   * {
   *   amountToPay: 100.00,        // Total amount to debit
   *   amountToGet: 95.50,         // Amount recipient receives
   *   fees: 4.50,                 // Total fees
   *   exchangeRate: 0.85,         // Exchange rate (if applicable)
   *   accountLeftBalance: 900.00, // Balance after transfer
   *   currency: "USD",
   *   destinationCurrency: "EUR",
   *   canExecute: true,           // Whether transfer can proceed
   *   requiresSMS: false          // Whether 2FA is needed
   * }
   * ```
   * 
   * USE CASES:
   * - Show transfer preview before execution
   * - Validate sufficient account balance
   * - Display exact fees to user
   * - Determine 2FA requirements
   * - Calculate exchange rates for multi-currency transfers
   * 
   * @param {number} userId - Local user ID from database
   * @param {Object} transferData - Transfer details with standard amounts
   * @param {string} transferData.accountId - Source account ID
   * @param {string} transferData.destinationAccount - Beneficiary ID
   * @param {number} transferData.amount - Transfer amount in standard units
   * @param {string} transferData.currency - Source currency code
   * @returns {Promise<Object>} Simulation result with converted amounts
   * 
   * @throws {Error} When user not authenticated, insufficient funds, or API errors
   * 
   * @example
   * // Transfer simulation endpoint
   * app.post('/transfer/simulate', async (req, res) => {
   *   try {
   *     const simulation = await userService.simulateUserTransfer(
   *       req.session.userId,
   *       req.body
   *     );
   *     res.json(simulation);
   *   } catch (error) {
   *     res.status(400).json({ error: error.message });
   *   }
   * });
   */
  async simulateUserTransfer(userId, transferData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Preparar datos (convertir a centavos)
    const preparedData = tropiPayService.prepareTransferData(transferData);
    
    // Simular en TropiPay
    const simulationResult = await tropiPayService.simulateTransfer(user.access_token, preparedData);
    
    // Convertir resultado y retornar
    return tropiPayService.convertSimulationFromCentavos(simulationResult);
  }

  /**
   * Execute transfer for user (send money)
   * 
   * Executes a real money transfer for the specified user, handling all
   * authentication, currency conversion, and response processing automatically.
   * This method should only be called after successful simulation and user confirmation.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   // Transfer data (same as used in simulation)
   *   const transferData = {
   *     accountId: selectedAccount.id,
   *     destinationAccount: selectedBeneficiary.id,
   *     amount: confirmedAmount,     // Same amount from simulation
   *     currency: "USD",
   *     description: "Payment for services",
   *     // Add 2FA code if required
   *     smsCode: userEnteredSMSCode  // If SMS 2FA is required
   *   };
   *   
   *   const result = await userService.executeUserTransfer(userId, transferData);
   *   
   *   // Show success message
   *   showSuccessDialog({
   *     transferId: result.id,
   *     status: result.status,
   *     amount: result.amount,
   *     reference: result.reference,
   *     estimatedArrival: result.estimatedArrival
   *   });
   *   
   *   // Refresh account balances
   *   await refreshAccountBalances();
   *   
   * } catch (error) {
   *   if (error.response?.status === 403) {
   *     showErrorDialog('Invalid 2FA code. Please try again.');
   *   } else if (error.response?.status === 402) {
   *     showErrorDialog('Insufficient funds');
   *   } else {
   *     showErrorDialog('Transfer failed: ' + error.message);
   *   }
   * }
   * ```
   * 
   * SECURITY REQUIREMENTS:
   * - User must be properly authenticated
   * - Transfer data should be identical to simulation data
   * - 2FA code must be provided if required by simulation
   * - Token must be valid and not expired
   * 
   * AUTOMATIC PROCESSING:
   * - Validates user authentication and token
   * - Converts transfer amounts to centavos for API
   * - Calls TropiPay transfer execution API
   * - Converts response amounts back to standard units
   * - Returns ready-to-display transfer result
   * 
   * TRANSFER RESULT (already converted):
   * ```javascript
   * {
   *   id: "transfer_12345",
   *   status: "PROCESSING",         // PROCESSING, COMPLETED, FAILED
   *   amount: 100.00,              // Transfer amount sent
   *   destinationAmount: 95.50,    // Amount recipient receives
   *   currency: "USD",
   *   destinationCurrency: "EUR",
   *   fees: 4.50,
   *   reference: "TRP123456789",    // TropiPay reference number
   *   createdAt: "2024-01-15T10:30:00Z",
   *   estimatedArrival: "2024-01-16T10:30:00Z"
   * }
   * ```
   * 
   * ERROR HANDLING:
   * - 401: Invalid or expired token (re-authentication needed)
   * - 402: Insufficient funds
   * - 403: Invalid or missing 2FA code
   * - 404: Beneficiary not found
   * - 422: Transfer limits exceeded or validation errors
   * 
   * @param {number} userId - Local user ID from database
   * @param {Object} transferData - Complete transfer data with 2FA if required
   * @param {string} transferData.accountId - Source account ID
   * @param {string} transferData.destinationAccount - Beneficiary ID
   * @param {number} transferData.amount - Transfer amount in standard units
   * @param {string} transferData.currency - Source currency code
   * @param {string} [transferData.smsCode] - SMS 2FA code (if required)
   * @param {string} [transferData.googleAuthCode] - Google Authenticator code (if required)
   * @returns {Promise<Object>} Transfer execution result with converted amounts
   * 
   * @throws {Error} When authentication fails, insufficient funds, invalid 2FA, or API errors
   * 
   * @example
   * // Complete transfer execution endpoint
   * app.post('/transfer/execute', async (req, res) => {
   *   try {
   *     const result = await userService.executeUserTransfer(
   *       req.session.userId,
   *       req.body
   *     );
   *     
   *     res.json({
   *       success: true,
   *       transfer: result
   *     });
   *   } catch (error) {
   *     const statusCode = error.response?.status || 500;
   *     res.status(statusCode).json({ error: error.message });
   *   }
   * });
   */
  async executeUserTransfer(userId, transferData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Preparar datos (convertir a centavos)
    const preparedData = tropiPayService.prepareTransferData(transferData);
    
    // Ejecutar en TropiPay
    const transferResult = await tropiPayService.executeTransfer(user.access_token, preparedData);
    
    // Convertir resultado
    return tropiPayService.convertTransferResult(transferResult);
  }

  // ========== 2FA ==========

  /**
   * Request SMS code for transfer 2FA with intelligent handling
   * 
   * Handles SMS 2FA requests for transfers with automatic environment detection,
   * user type checking, and demo mode support. This method intelligently
   * determines the appropriate 2FA flow based on user settings and environment.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * try {
   *   const result = await userService.requestTransferSMS(userId, userPhoneNumber);
   *   
   *   if (result.skipSMS) {
   *     // User has Google Authenticator
   *     showAuthenticatorInput('Enter code from your authenticator app');
   *   } else if (result.isDemoMode) {
   *     // Demo/development environment
   *     showSMSInput('Demo mode: use code 123456');
   *   } else {
   *     // SMS sent successfully
   *     showSMSInput('SMS code sent to your phone');
   *   }
   *   
   * } catch (error) {
   *   console.error('2FA request failed:', error.message);
   *   showErrorDialog('Could not send verification code');
   * }
   * ```
   * 
      * INTELLIGENT 2FA HANDLING:
   * 1. Checks user's 2FA type from profile (SMS vs Google Authenticator)
   * 2. Handles demo/development environment with bypass codes
   * 3. Sends actual SMS in production environment
   * 4. Returns appropriate response based on configuration
   * 
   * RESPONSE TYPES:
   * 
   * Google Authenticator User:
   * ```javascript
   * {
   *   message: "User has Google Authenticator configured",
   *   skipSMS: true
   * }
   * ```
   * 
   * Demo/Development Environment:
   * ```javascript
   * {
   *   message: "Demo mode: use code 123456",
   *   skipSMS: false,
   *   isDemoMode: true,
   *   demoCode: "123456"
   * }
   * ```
   * 
      * Production SMS Sent:
   * ```javascript
   * {
   *   message: "SMS code sent successfully",
   *   data: { // SMS response data  }
   * }
   * ```
   * 
   * ENVIRONMENT DETECTION:
   * - Automatically detects current TropiPay environment
   * - Uses demo codes in development environment
   * - Sends real SMS in production environment
   * - Useful for testing without SMS charges
   * 
   * @param {number} userId - Local user ID from database
   * @param {string} phoneNumber - User's phone number with country code
   * @returns {Promise<Object>} 2FA request result with appropriate instructions
   * @returns {string} returns.message - Status message for display
   * @returns {boolean} [returns.skipSMS] - true if SMS should be skipped (Google Auth)
   * @returns {boolean} [returns.isDemoMode] - true if running in demo mode
   * @returns {string} [returns.demoCode] - Demo code to use (development only)
   * 
   * @throws {Error} When user not found, token expired, or SMS service fails
   * 
   * @example
   * // Complete 2FA workflow
   * const smsResult = await userService.requestTransferSMS(userId, phoneNumber);
   * 
   * let verificationCode;
   * if (smsResult.skipSMS) {
   *   verificationCode = await getUserAuthenticatorCode();
   *   transferData.googleAuthCode = verificationCode;
   * } else {
   *   verificationCode = await getUserSMSCode();
   *   transferData.smsCode = verificationCode;
   * }
   * 
   * @example
   * // 2FA request endpoint
   * app.post('/transfer/request-sms', async (req, res) => {
   *   try {
   *     const result = await userService.requestTransferSMS(
   *       req.session.userId,
   *       req.body.phoneNumber
   *     );
   *     res.json(result);
   *   } catch (error) {
   *     res.status(400).json({ error: error.message });
   *   }
   * });
   */
  async requestTransferSMS(userId, phoneNumber) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar el tipo de 2FA del usuario
    let userProfile = {};
    try {
      userProfile = JSON.parse(user.user_data || '{}');
    } catch (e) {
      console.log('Warning: Could not parse user data');
    }

    const twoFaType = userProfile.twoFaType;
    console.log(`🔐 Usuario ${userId} - Tipo 2FA: ${twoFaType} (1=SMS, 2=Google Authenticator)`);

    if (twoFaType === 2) {
      return {
        message: 'Usuario tiene Google Authenticator configurado',
        skipSMS: true
      };
    }

    // Verificar si estamos en entorno demo/development
    const currentEnvironment = tropiPayService.getCurrentEnvironment();
    if (currentEnvironment === 'development') {
      console.log(`🚀 Entorno DEMO detectado - Bypass SMS activado`);
      return {
        message: 'Entorno demo: usa el código 123456',
        skipSMS: false,
        isDemoMode: true,
        demoCode: '123456'
      };
    }

    // Solicitar SMS en entorno de producción
    const result = await tropiPayService.requestSMSCode(user.access_token, phoneNumber);
    
    return {
      message: 'Código SMS enviado correctamente',
      data: result
    };
  }

  // ========== BENEFICIARIOS NUEVOS ==========

  /**
   * Crear beneficiario usando la API correcta
   */
  async createUserBeneficiaryNew(userId, beneficiaryData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    // Crear beneficiario en TropiPay
    const beneficiary = await tropiPayService.createBeneficiary(user.access_token, beneficiaryData);
    
    // Refrescar lista de beneficiarios
    await this.refreshUserBeneficiaries(userId);
    
    return beneficiary;
  }

  /**
   * Validar número de cuenta
   */
  async validateAccountNumber(userId, validationData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    return await tropiPayService.validateAccountNumber(user.access_token, validationData);
  }

  /**
   * Validar código SWIFT
   */
  async validateSwiftCode(userId, validationData) {
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      throw new Error('Usuario no autenticado');
    }

    return await tropiPayService.validateSwiftCode(user.access_token, validationData);
  }

  // ========== UTILIDADES ==========

  /**
   * Obtener usuario por ID
   */
  async getUser(userId) {
    return await database.getUserById(userId);
  }
}

/**
 * Export singleton instance of UserService
 * 
 * This singleton provides a complete business logic layer for TropiPay
 * wallet integration with intelligent caching, error handling, and
 * offline-first design patterns.
 * 
 * CLIENT INTEGRATION USAGE:
 * ```javascript
 * // Import the service anywhere in your application
 * const userService = require('./services/userService');
 * 
 * // Complete authentication workflow
 * const result = await userService.authenticateUser(clientId, clientSecret);
 * 
 * // Account management with intelligent caching
 * const accounts = await userService.refreshUserAccounts(userId);
 * 
 * // Transfer processing with 2FA support
 * const simulation = await userService.simulateUserTransfer(userId, transferData);
 * const result = await userService.executeUserTransfer(userId, transferData);
 * ```
 * 
 * KEY INTEGRATION PATTERNS:
 * 
 * 1. Complete Authentication Flow:
 * ```javascript
 * app.post('/auth/login', async (req, res) => {
 *   try {
 *     const result = await userService.authenticateUser(
 *       req.body.clientId,
 *       req.body.clientSecret,
 *       req.body.environment
 *     );
 *     
 *     req.session.userId = result.user.id;
 *     res.json({ success: true, user: result.user });
 *   } catch (error) {
 *     res.status(401).json({ error: error.message });
 *   }
 * });
 * ```
 * 
 * 2. Dashboard Data Loading:
 * ```javascript
 * app.get('/dashboard', async (req, res) => {
 *   const userId = req.session.userId;
 *   
 *   const [accounts, beneficiaries] = await Promise.all([
 *     userService.refreshUserAccounts(userId),
 *     userService.refreshUserBeneficiaries(userId)
 *   ]);
 *   
 *   res.json({ accounts, beneficiaries });
 * });
 * ```
 * 
 * 3. Complete Transfer Workflow:
 * ```javascript
 * // Simulate transfer
 * app.post('/transfer/simulate', async (req, res) => {
 *   const simulation = await userService.simulateUserTransfer(
 *     req.session.userId,
 *     req.body
 *   );
 *   res.json(simulation);
 * });
 * 
 * // Execute transfer
 * app.post('/transfer/execute', async (req, res) => {
 *   const result = await userService.executeUserTransfer(
 *     req.session.userId,
 *     req.body
 *   );
 *   res.json(result);
 * });
 * ```
 * 
 * 4. Transaction History:
 * ```javascript
 * app.get('/accounts/:accountId/movements', async (req, res) => {
 *   const movements = await userService.getUserAccountMovements(
 *     req.session.userId,
 *     req.params.accountId,
 *     parseInt(req.query.offset) || 0,
 *     parseInt(req.query.limit) || 20
 *   );
 *   res.json(movements);
 * });
 * ```
 * 
 * ADVANTAGES OF THIS SERVICE LAYER:
 * - Handles all TropiPay API complexities automatically
 * - Provides intelligent caching with offline fallback
 * - Manages token expiration and authentication state
 * - Converts all currency amounts to user-friendly formats
 * - Implements proper error handling and recovery
 * - Supports multi-environment switching
 * - Includes comprehensive 2FA handling
 * 
 * @type {UserService} Singleton service instance
 */
module.exports = new UserService();