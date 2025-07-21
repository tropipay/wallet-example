/**
 * TropiPay SDK - Main SDK Class
 * 
 * This is the main entry point for all TropiPay API interactions.
 * The SDK provides a clean, promise-based interface for authentication,
 * account management, transfers, and beneficiary operations.
 * 
 * @class TropiPaySDK
 */

const axios = require('axios');
const EventEmitter = require('eventemitter3');

const AuthModule = require('./modules/auth');
const AccountsModule = require('./modules/accounts');
const TransfersModule = require('./modules/transfers');
const BeneficiariesModule = require('./modules/beneficiaries');

const { ENVIRONMENTS } = require('./utils/constants');
const { TropiPayError, AuthenticationError, ValidationError } = require('./utils/errors');
const { validateConfig, formatCurrency } = require('./utils/helpers');

/**
 * Main TropiPay SDK Class
 * 
 * @class TropiPaySDK
 * @extends EventEmitter
 */
class TropiPaySDK extends EventEmitter {
  /**
   * Create a new TropiPay SDK instance
   * 
   * @param {Object} config - SDK configuration
   * @param {string} config.clientId - TropiPay Client ID
   * @param {string} config.clientSecret - TropiPay Client Secret
   * @param {string} [config.environment='development'] - API environment (development/production)
   * @param {number} [config.timeout=10000] - Request timeout in milliseconds
   * @param {boolean} [config.debug=false] - Enable debug logging
   * @param {Object} [config.retries] - Retry configuration
   * @param {number} [config.retries.max=3] - Maximum number of retries
   * @param {number} [config.retries.delay=1000] - Delay between retries (ms)
   * 
   * @example
   * // Initialize SDK for development
   * const sdk = new TropiPaySDK({
   *   clientId: 'your_client_id',
   *   clientSecret: 'your_client_secret',
   *   environment: 'development',
   *   debug: true
   * });
   * 
   * // Listen for events
   * sdk.on('authenticated', (user) => {
   *   console.log('User authenticated:', user.profile.email);
   * });
   * 
   * sdk.on('error', (error) => {
   *   console.error('SDK Error:', error.message);
   * });
   */
  constructor(config) {
    super();
    
    // Validate configuration
    this.config = validateConfig(config);
    
    // Initialize HTTP client
    this._initHttpClient();
    
    // Initialize modules
    this.auth = new AuthModule(this);
    this.accounts = new AccountsModule(this);
    this.transfers = new TransfersModule(this);
    this.beneficiaries = new BeneficiariesModule(this);
    
    // Internal state
    this._accessToken = null;
    this._tokenExpiry = null;
    this._userProfile = null;
    this._isAuthenticated = false;
    
    if (this.config.debug) {
      console.log('✅ TropiPay SDK initialized', {
        environment: this.config.environment,
        baseURL: this._httpClient.defaults.baseURL
      });
    }
  }

  /**
   * Initialize HTTP client with interceptors
   * @private
   */
  _initHttpClient() {
    const baseURL = ENVIRONMENTS[this.config.environment];
    if (!baseURL) {
      throw new ValidationError(`Invalid environment: ${this.config.environment}`);
    }

    this._httpClient = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `TropiPay-SDK-JS/1.0.0`
      }
    });

    // Request interceptor
    this._httpClient.interceptors.request.use(
      (config) => {
        // Add authentication if available
        if (this._accessToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${this._accessToken}`;
        }

        if (this.config.debug) {
          console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: config.params,
            data: config.data
          });
        }

        this.emit('request', config);
        return config;
      },
      (error) => {
        this.emit('requestError', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this._httpClient.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log('✅ API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
          });
        }

        this.emit('response', response);
        return response;
      },
      async (error) => {
        if (this.config.debug) {
          console.error('❌ API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            data: error.response?.data
          });
        }

        // Handle token expiration
        if (error.response?.status === 401 && this._accessToken) {
          this._accessToken = null;
          this._tokenExpiry = null;
          this._isAuthenticated = false;
          this.emit('tokenExpired');
          
          // Attempt to re-authenticate if auto-refresh is enabled
          if (this.config.autoRefreshToken) {
            try {
              await this.authenticate();
              // Retry the original request
              return this._httpClient.request(error.config);
            } catch (authError) {
              this.emit('authenticationFailed', authError);
            }
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 5;
          this.emit('rateLimited', { retryAfter });
          
          if (this.config.retries?.enabled) {
            await this._delay(retryAfter * 1000);
            return this._httpClient.request(error.config);
          }
        }

        this.emit('error', error);
        return Promise.reject(this._handleError(error));
      }
    );
  }

  /**
   * Authenticate with TropiPay API
   * 
   * This method authenticates the SDK with TropiPay using Client Credentials flow.
   * After successful authentication, all API calls will automatically include
   * the access token.
   * 
   * @returns {Promise<Object>} Authentication result with user profile
   * 
   * @throws {AuthenticationError} When authentication fails
   * 
   * @example
   * // Authenticate and get user profile
   * try {
   *   const result = await sdk.authenticate();
   *   console.log('Welcome,', result.profile.firstName);
   *   console.log('Available accounts:', result.accounts.length);
   * } catch (error) {
   *   console.error('Authentication failed:', error.message);
   * }
   * 
   * @fires TropiPaySDK#authenticated
   */
  async authenticate() {
    try {
      const result = await this.auth.authenticate(
        this.config.clientId, 
        this.config.clientSecret
      );

      this._accessToken = result.accessToken;
      this._tokenExpiry = result.expiresAt;
      this._userProfile = result.profile;
      this._isAuthenticated = true;

      /**
       * Authentication successful event
       * @event TropiPaySDK#authenticated
       * @type {Object}
       * @property {Object} profile - User profile information
       * @property {Array} accounts - User accounts
       */
      this.emit('authenticated', result);

      return result;
    } catch (error) {
      this._isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Check if SDK is authenticated and token is valid
   * 
   * @returns {boolean} True if authenticated and token is valid
   * 
   * @example
   * if (!sdk.isAuthenticated()) {
   *   await sdk.authenticate();
   * }
   */
  isAuthenticated() {
    if (!this._accessToken || !this._tokenExpiry) {
      return false;
    }

    // Check if token is still valid (with 5 minute buffer)
    const now = new Date();
    const expiry = new Date(this._tokenExpiry);
    const buffer = 5 * 60 * 1000; // 5 minutes

    return now.getTime() < (expiry.getTime() - buffer);
  }

  /**
   * Get current user profile
   * 
   * @returns {Object|null} User profile or null if not authenticated
   * 
   * @example
   * const profile = sdk.getUserProfile();
   * if (profile) {
   *   console.log('User ID:', profile.id);
   *   console.log('Email:', profile.email);
   *   console.log('KYC Level:', profile.kycLevel);
   * }
   */
  getUserProfile() {
    return this._userProfile;
  }

  /**
   * Get current access token
   * 
   * @returns {string|null} Access token or null if not authenticated
   * 
   * @example
   * const token = sdk.getAccessToken();
   * if (token) {
   *   // Use token for direct API calls if needed
   *   console.log('Token expires at:', sdk.getTokenExpiry());
   * }
   */
  getAccessToken() {
    return this._accessToken;
  }

  /**
   * Get token expiry date
   * 
   * @returns {Date|null} Token expiry date or null if not authenticated
   */
  getTokenExpiry() {
    return this._tokenExpiry ? new Date(this._tokenExpiry) : null;
  }

  /**
   * Logout and clear authentication state
   * 
   * @example
   * sdk.logout();
   * console.log('Logged out, authenticated:', sdk.isAuthenticated()); // false
   * 
   * @fires TropiPaySDK#logout
   */
  logout() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._userProfile = null;
    this._isAuthenticated = false;

    /**
     * Logout event
     * @event TropiPaySDK#logout
     */
    this.emit('logout');
  }

  /**
   * Make a raw HTTP request to TropiPay API
   * 
   * This method provides direct access to the HTTP client for advanced use cases.
   * Authentication is automatically handled.
   * 
   * @param {Object} options - Axios request options
   * @returns {Promise<Object>} Response data
   * 
   * @example
   * // Make a custom API call
   * const response = await sdk.request({
   *   method: 'GET',
   *   url: '/custom-endpoint',
   *   params: { limit: 10 }
   * });
   */
  async request(options) {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await this._httpClient.request(options);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Convert error to appropriate SDK error type
   * @private
   */
  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return new AuthenticationError(data?.message || 'Authentication failed');
        case 400:
        case 422:
          return new ValidationError(data?.message || 'Validation failed', data?.errors);
        case 403:
          return new TropiPayError('Access forbidden', 'FORBIDDEN');
        case 404:
          return new TropiPayError('Resource not found', 'NOT_FOUND');
        case 429:
          return new TropiPayError('Rate limit exceeded', 'RATE_LIMITED');
        case 500:
        case 502:
        case 503:
          return new TropiPayError('Service temporarily unavailable', 'SERVICE_ERROR');
        default:
          return new TropiPayError(data?.message || 'API Error', 'API_ERROR');
      }
    } else if (error.code === 'ECONNABORTED') {
      return new TropiPayError('Request timeout', 'TIMEOUT');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new TropiPayError('Network error', 'NETWORK_ERROR');
    }

    return error instanceof TropiPayError ? error : new TropiPayError(error.message);
  }

  /**
   * Delay helper for retries
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get SDK configuration
   * 
   * @returns {Object} Current SDK configuration (without sensitive data)
   * 
   * @example
   * const config = sdk.getConfig();
   * console.log('Environment:', config.environment);
   * console.log('Timeout:', config.timeout);
   */
  getConfig() {
    return {
      environment: this.config.environment,
      timeout: this.config.timeout,
      debug: this.config.debug,
      retries: this.config.retries
    };
  }

  /**
   * Update SDK configuration
   * 
   * @param {Object} newConfig - New configuration options
   * 
   * @example
   * // Enable debug mode
   * sdk.updateConfig({ debug: true });
   * 
   * // Change timeout
   * sdk.updateConfig({ timeout: 15000 });
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.timeout) {
      this._httpClient.defaults.timeout = newConfig.timeout;
    }
    
    if (newConfig.environment && newConfig.environment !== this.config.environment) {
      this._httpClient.defaults.baseURL = ENVIRONMENTS[newConfig.environment];
      // Clear authentication when changing environment
      this.logout();
    }
  }
}

module.exports = TropiPaySDK;