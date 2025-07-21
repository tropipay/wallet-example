/**
 * TropiPay Configuration Manager
 * 
 * This configuration manager handles environment setup, API endpoints, and service
 * configuration for TropiPay wallet integration. It's designed to help client developers
 * easily configure their applications to work with both TropiPay sandbox (development)
 * and production environments.
 * 
 * @fileoverview Configuration management for TropiPay API integration
 * 
 * INTEGRATION GUIDE FOR CLIENT DEVELOPERS:
 * =======================================
 * 
 * 1. ENVIRONMENT SETUP:
 *    - Create a .env file in your project root
 *    - Configure the required environment variables (see below)
 *    - Use development environment for testing, production for live transactions
 * 
 * 2. REQUIRED ENVIRONMENT VARIABLES:
 *    - TROPIPAY_DEV_API_URL: TropiPay sandbox API URL (default: https://sandbox.tropipay.com/api/v3)
 *    - TROPIPAY_PROD_API_URL: TropiPay production API URL (default: https://www.tropipay.com/api/v3)
 *    - TROPIPAY_DEFAULT_ENV: Default environment to use (development|production)
 *    - FRONTEND_URL: Your frontend application URL for CORS
 *    - PORT: Backend server port
 * 
 * 3. OPTIONAL ENVIRONMENT VARIABLES:
 *    - API_TIMEOUT: API request timeout in milliseconds (default: 10000)
 *    - DEVICE_ID: Unique device identifier for API requests
 *    - ENABLE_API_LOGGING: Enable detailed API request/response logging (true/false)
 *    - LOG_LEVEL: Logging level (info, debug, warn, error)
 *    - DB_PATH: SQLite database file path
 * 
 * 4. USAGE EXAMPLES:
 * 
 * Basic setup in .env:
 * ```
 * TROPIPAY_DEFAULT_ENV=development
 * FRONTEND_URL=http://localhost:3000
 * PORT=3001
 * ENABLE_API_LOGGING=true
 * ```
 * 
 * Production setup in .env:
 * ```
 * TROPIPAY_DEFAULT_ENV=production
 * TROPIPAY_PROD_API_URL=https://www.tropipay.com/api/v3
 * FRONTEND_URL=https://yourdomain.com
 * PORT=8080
 * ENABLE_API_LOGGING=false
 * ```
 * 
 * 5. ENVIRONMENT SWITCHING:
 *    This config supports dynamic environment switching at runtime,
 *    allowing your application to switch between sandbox and production
 *    without restart. This is useful for multi-tenant applications.
 * 
 * @author TropiPay Integration Team
 * @version 1.0.0
 * @since 2024
 */

require('dotenv').config();

/**
 * Configuration manager class for TropiPay integration
 * 
 * This singleton class manages all configuration aspects needed for TropiPay
 * API integration including environment URLs, timeouts, authentication settings,
 * and development/production mode switching.
 */
class Config {
  /**
   * Initialize the configuration manager with environment variables
   * 
   * This constructor loads all configuration from environment variables
   * and sets up default values for TropiPay integration. It automatically
   * detects the environment and configures the appropriate API endpoints.
   * 
   * CLIENT INTEGRATION NOTES:
   * - All configuration is loaded from environment variables
   * - Default values are provided for development convenience
   * - Production deployments should override all defaults via environment
   * 
   * @constructor
   */
  constructor() {
    // Server configuration - Basic server setup
    this.port = process.env.PORT || 3001;
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // TropiPay API URLs by environment - Core integration endpoints
    // These URLs point to TropiPay's sandbox and production environments
    this.tropiPayUrls = {
      development: process.env.TROPIPAY_DEV_API_URL || 'https://sandbox.tropipay.com/api/v3',
      production: process.env.TROPIPAY_PROD_API_URL || 'https://www.tropipay.com/api/v3'
    };
    
    // API configuration - Request handling settings
    this.apiTimeout = parseInt(process.env.API_TIMEOUT) || 10000; // 10 seconds default
    this.deviceId = process.env.DEVICE_ID || 'tropipay-wallet-app'; // Required by TropiPay API
    
    // Database configuration - Local storage settings
    this.dbPath = process.env.DB_PATH || './tropipay_wallet.db';
    
    // Logging configuration - Debug and monitoring settings
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableApiLogging = process.env.ENABLE_API_LOGGING === 'true';
    
    // Default TropiPay environment - Starting environment for API calls
    this.defaultTropiPayEnv = process.env.TROPIPAY_DEFAULT_ENV || 'development';
  }

  /**
   * Get TropiPay API URL for the specified environment
   * 
   * This method returns the appropriate TropiPay API base URL based on the
   * environment parameter. It's the primary method for determining which
   * TropiPay endpoint to use for API requests.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const config = require('./config/config');
   * 
   * // Get development URL (sandbox)
   * const devUrl = config.getTropiPayUrl('development');
   * // Returns: https://sandbox.tropipay.com/api/v3
   * 
   * // Get production URL
   * const prodUrl = config.getTropiPayUrl('production');
   * // Returns: https://www.tropipay.com/api/v3
   * 
   * // Use default environment
   * const defaultUrl = config.getTropiPayUrl();
   * ```
   * 
   * @param {string} [environment=null] - Target environment ('development' or 'production')
   *                                     If null, uses defaultTropiPayEnv
   * @returns {string} The complete TropiPay API base URL for the environment
   * 
   * @example
   * // Switch to production for live transactions
   * const apiUrl = config.getTropiPayUrl('production');
   * 
   * @example
   * // Use default environment (from TROPIPAY_DEFAULT_ENV)
   * const apiUrl = config.getTropiPayUrl();
   */
  getTropiPayUrl(environment = null) {
    const env = environment || this.defaultTropiPayEnv;
    
    if (!this.tropiPayUrls[env]) {
      console.warn(`⚠️  Invalid TropiPay environment: ${env}. Using development.`);
      return this.tropiPayUrls.development;
    }
    
    return this.tropiPayUrls[env];
  }

  /**
   * Validate if the specified environment is supported
   * 
   * This utility method checks if the provided environment string is one of the
   * supported TropiPay environments. Use this for input validation before making
   * environment-specific operations.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const config = require('./config/config');
   * 
   * // Validate user input
   * const userEnv = req.body.environment;
   * if (!config.isValidEnvironment(userEnv)) {
   *   return res.status(400).json({ error: 'Invalid environment' });
   * }
   * ```
   * 
   * @param {string} environment - Environment name to validate
   * @returns {boolean} true if environment is valid ('development' or 'production')
   * 
   * @example
   * const isValid = config.isValidEnvironment('development'); // true
   * const isInvalid = config.isValidEnvironment('staging'); // false
   */
  isValidEnvironment(environment) {
    return ['development', 'production'].includes(environment);
  }

  /**
   * Get complete logging configuration
   * 
   * Returns the current logging settings for the application. This is useful
   * for configuring logging libraries or debugging API interactions.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const config = require('./config/config');
   * const logConfig = config.getLogConfig();
   * 
   * // Configure your logger
   * if (logConfig.enableApiLogging) {
   *   console.log('API logging is enabled');
   *   // Setup detailed API request/response logging
   * }
   * ```
   * 
   * @returns {Object} Logging configuration object
   * @returns {string} returns.level - Current log level ('info', 'debug', 'warn', 'error')
   * @returns {boolean} returns.enableApiLogging - Whether API request/response logging is enabled
   * 
   * @example
   * const { level, enableApiLogging } = config.getLogConfig();
   * if (enableApiLogging) {
   *   // Enable detailed TropiPay API logging
   * }
   */
  getLogConfig() {
    return {
      level: this.logLevel,
      enableApiLogging: this.enableApiLogging
    };
  }

  /**
   * Get CORS configuration for Express server
   * 
   * Returns the CORS configuration object that should be used with the
   * Express cors middleware. This ensures your frontend can communicate
   * with the TropiPay backend service.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const express = require('express');
   * const cors = require('cors');
   * const config = require('./config/config');
   * 
   * const app = express();
   * app.use(cors(config.getCorsConfig()));
   * ```
   * 
   * @returns {Object} CORS configuration object for Express
   * @returns {string} returns.origin - Allowed origin URL (from FRONTEND_URL env var)
   * @returns {boolean} returns.credentials - Whether credentials are allowed (always true)
   * 
   * @example
   * // Setup CORS for TropiPay wallet integration
   * const corsConfig = config.getCorsConfig();
   * app.use(cors(corsConfig));
   */
  getCorsConfig() {
    return {
      origin: this.frontendUrl,
      credentials: true
    };
  }

  /**
   * Get complete environment information
   * 
   * Returns a comprehensive object containing all current environment settings.
   * This is useful for debugging, health checks, or displaying system information
   * in admin interfaces.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const config = require('./config/config');
   * 
   * // Health check endpoint
   * app.get('/health', (req, res) => {
   *   const envInfo = config.getEnvironmentInfo();
   *   res.json({
   *     status: 'healthy',
   *     environment: envInfo
   *   });
   * });
   * ```
   * 
   * @returns {Object} Complete environment configuration
   * @returns {string} returns.nodeEnv - Node.js environment (development/production)
   * @returns {number} returns.port - Server port number
   * @returns {string} returns.defaultTropiPayEnv - Default TropiPay environment
   * @returns {Object} returns.tropiPayUrls - All configured TropiPay URLs
   * @returns {string} returns.frontendUrl - Configured frontend URL
   * 
   * @example
   * // Debug current configuration
   * console.log('Current config:', config.getEnvironmentInfo());
   */
  getEnvironmentInfo() {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      defaultTropiPayEnv: this.defaultTropiPayEnv,
      tropiPayUrls: this.tropiPayUrls,
      frontendUrl: this.frontendUrl
    };
  }

  /**
   * Print startup configuration information to console
   * 
   * This method outputs a formatted summary of all configuration settings
   * when the application starts. It's useful for verifying configuration
   * and debugging deployment issues.
   * 
   * CLIENT INTEGRATION USAGE:
   * ```javascript
   * const config = require('./config/config');
   * 
   * // Display configuration on server startup
   * config.printStartupInfo();
   * 
   * app.listen(config.port, () => {
   *   console.log('TropiPay wallet service started');
   * });
   * ```
   * 
   * OUTPUT EXAMPLE:
   * ```
   * 🔧 === ENVIRONMENT CONFIGURATION ===
   * 🌍 Node Environment: development
   * 🚀 Port: 3001
   * 🌐 Frontend: http://localhost:3000
   * 🔄 Default TropiPay: development
   * 🏠 TropiPay Development: https://sandbox.tropipay.com/api/v3
   * 🏢 TropiPay Production: https://www.tropipay.com/api/v3
   * 📊 API Logging: Enabled
   * ===================================
   * ```
   * 
   * @returns {void}
   * 
   * @example
   * // Show configuration at startup
   * config.printStartupInfo();
   */
  printStartupInfo() {
    console.log('\n🔧 === ENVIRONMENT CONFIGURATION ===');
    console.log(`🌍 Node Environment: ${this.nodeEnv}`);
    console.log(`🚀 Port: ${this.port}`);
    console.log(`🌐 Frontend: ${this.frontendUrl}`);
    console.log(`🔄 Default TropiPay: ${this.defaultTropiPayEnv}`);
    console.log(`🏠 TropiPay Development: ${this.tropiPayUrls.development}`);
    console.log(`🏢 TropiPay Production: ${this.tropiPayUrls.production}`);
    console.log(`📊 API Logging: ${this.enableApiLogging ? 'Enabled' : 'Disabled'}`);
    console.log('===================================\n');
  }
}

/**
 * Export singleton instance of the Config class
 * 
 * This ensures that all parts of your application use the same configuration
 * instance, providing consistency across your TropiPay integration.
 * 
 * CLIENT INTEGRATION USAGE:
 * ```javascript
 * // Import the configuration anywhere in your app
 * const config = require('./config/config');
 * 
 * // Use configuration methods
 * const apiUrl = config.getTropiPayUrl('production');
 * const corsSettings = config.getCorsConfig();
 * ```
 * 
 * @type {Config} Singleton configuration instance
 */
module.exports = new Config();