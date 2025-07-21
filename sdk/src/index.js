/**
 * TropiPay Wallet SDK - Main Entry Point
 * 
 * Official JavaScript SDK for integrating TropiPay's payment and wallet services.
 * This SDK provides a comprehensive, easy-to-use interface for building digital
 * wallets and payment applications.
 * 
 * @author TropiPay Team
 * @version 1.0.0
 * 
 * @example
 * // Basic SDK initialization
 * const TropiPaySDK = require('@tropipay/wallet-sdk');
 * 
 * const sdk = new TropiPaySDK({
 *   clientId: 'your_client_id',
 *   clientSecret: 'your_client_secret',
 *   environment: 'development' // or 'production'
 * });
 * 
 * // Authenticate and use
 * await sdk.authenticate();
 * const accounts = await sdk.accounts.getAll();
 */

const TropiPaySDK = require('./TropiPaySDK');
const { TropiPayError, AuthenticationError, ValidationError, APIError } = require('./utils/errors');
const { ENVIRONMENTS, CURRENCIES, TRANSFER_TYPES } = require('./utils/constants');

// Export main SDK class
module.exports = TropiPaySDK;

// Export additional utilities and types
module.exports.TropiPaySDK = TropiPaySDK;
module.exports.TropiPayError = TropiPayError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.ValidationError = ValidationError;
module.exports.APIError = APIError;
module.exports.ENVIRONMENTS = ENVIRONMENTS;
module.exports.CURRENCIES = CURRENCIES;
module.exports.TRANSFER_TYPES = TRANSFER_TYPES;

// Version info
module.exports.version = '1.0.0';
module.exports.apiVersion = 'v3';