/**
 * TropiPay SDK - Transfers Module
 * 
 * This module handles all money transfer operations including simulation,
 * execution, and 2FA verification. It provides a comprehensive interface
 * for sending money both domestically and internationally through TropiPay's
 * secure payment infrastructure.
 * 
 * @author TropiPay Team
 * @version 1.0.0
 */

const { ENDPOINTS, TRANSFER_TYPES } = require('../utils/constants');
const { 
  AuthenticationError, 
  ValidationError, 
  TransferError, 
  InsufficientFundsError 
} = require('../utils/errors');
const { 
  convertToCentavos, 
  convertFromCentavos, 
  isValidCurrency, 
  isValidAmount,
  generateReference,
  formatCurrency 
} = require('../utils/helpers');

/**
 * Transfers Module
 * 
 * Provides comprehensive money transfer functionality with support for
 * simulation, execution, 2FA verification, and transfer tracking.
 * 
 * @class TransfersModule
 */
class TransfersModule {
  /**
   * Create transfers module
   * 
   * @param {TropiPaySDK} sdk - Reference to main SDK instance
   */
  constructor(sdk) {
    this.sdk = sdk;
    this._httpClient = sdk._httpClient;
  }

  /**
   * Simulate a money transfer
   * 
   * This method simulates a transfer to calculate fees, exchange rates,
   * and final amounts before executing the actual transfer. Always use
   * simulation before executing transfers to show users exact costs.
   * 
   * @param {Object} transferData - Transfer simulation data
   * @param {string} transferData.fromAccountId - Source account identifier
   * @param {string} transferData.beneficiaryId - Destination beneficiary identifier
   * @param {number} transferData.amount - Amount to transfer (in account currency)
   * @param {string} [transferData.currency] - Transfer currency (defaults to account currency)
   * @param {string} [transferData.reason] - Transfer reason/description
   * @returns {Promise<Object>} Simulation result with fees and final amounts
   * @returns {number} returns.amountToPay - Total amount to be deducted from account
   * @returns {number} returns.amountToReceive - Amount recipient will receive
   * @returns {number} returns.fees - Total fees for the transfer
   * @returns {number} returns.exchangeRate - Exchange rate (if applicable)
   * @returns {string} returns.fromCurrency - Source currency
   * @returns {string} returns.toCurrency - Destination currency
   * @returns {Object} returns.breakdown - Detailed fee breakdown
   * @returns {boolean} returns.requires2FA - Whether 2FA is required
   * @returns {number} returns.accountBalanceAfter - Account balance after transfer
   * @returns {string} returns.estimatedArrival - Estimated arrival time
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {ValidationError} When transfer data is invalid
   * @throws {InsufficientFundsError} When account has insufficient funds
   * 
   * @example
   * // Simulate a domestic transfer
   * try {
   *   const simulation = await sdk.transfers.simulate({
   *     fromAccountId: 'usd_account_123',
   *     beneficiaryId: 'beneficiary_456',
   *     amount: 100.00,
   *     reason: 'Payment for services'
   *   });
   *   
   *   console.log('Transfer Summary:');
   *   console.log(`Amount to send: ${formatCurrency(simulation.amountToPay, simulation.fromCurrency)}`);
   *   console.log(`Recipient gets: ${formatCurrency(simulation.amountToReceive, simulation.toCurrency)}`);
   *   console.log(`Total fees: ${formatCurrency(simulation.fees, simulation.fromCurrency)}`);
   *   console.log(`2FA required: ${simulation.requires2FA ? 'Yes' : 'No'}`);
   *   
   *   if (simulation.exchangeRate !== 1) {
   *     console.log(`Exchange rate: 1 ${simulation.fromCurrency} = ${simulation.exchangeRate} ${simulation.toCurrency}`);
   *   }
   * } catch (error) {
   *   if (error instanceof InsufficientFundsError) {
   *     console.error('Insufficient funds for this transfer');
   *   } else {
   *     console.error('Simulation failed:', error.message);
   *   }
   * }
   * 
   * @example
   * // International transfer simulation
   * const internationalSimulation = await sdk.transfers.simulate({
   *   fromAccountId: 'usd_account_123',
   *   beneficiaryId: 'spain_beneficiary_789',
   *   amount: 500.00,
   *   currency: 'EUR',
   *   reason: 'Family support'
   * });
   * 
   * // Show detailed breakdown
   * console.log('Fee Breakdown:');
   * console.log(`Base fee: ${formatCurrency(internationalSimulation.breakdown.baseFee, 'USD')}`);
   * console.log(`Exchange fee: ${formatCurrency(internationalSimulation.breakdown.exchangeFee, 'USD')}`);
   * console.log(`International fee: ${formatCurrency(internationalSimulation.breakdown.internationalFee, 'USD')}`);
   */
  async simulate(transferData) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    // Validate transfer data
    this._validateTransferData(transferData);

    const {
      fromAccountId,
      beneficiaryId,
      amount,
      currency,
      reason = ''
    } = transferData;

    try {
      // Prepare API payload (convert to centavos)
      const payload = {
        accountId: fromAccountId,
        destinationAccount: beneficiaryId,
        amount: convertToCentavos(amount),
        currency: currency,
        concept: reason,
        reference: generateReference('SIM')
      };

      const response = await this._httpClient.post(ENDPOINTS.TRANSFER_SIMULATE, payload);
      const simulationData = response.data;

      // Process and convert simulation response
      const result = this._processSimulationResponse(simulationData);

      if (this.sdk.config.debug) {
        console.log('✅ Transfer simulation completed', {
          amount: amount,
          fees: result.fees,
          requires2FA: result.requires2FA
        });
      }

      return result;

    } catch (error) {
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        if (errorData?.code === 'INSUFFICIENT_FUNDS') {
          throw new InsufficientFundsError(
            'Insufficient funds for this transfer',
            {
              available: convertFromCentavos(errorData.available || 0),
              required: amount
            }
          );
        }
        
        throw new ValidationError(errorData?.message || 'Transfer simulation failed');
      }

      if (this.sdk.config.debug) {
        console.error('❌ Transfer simulation failed:', error.message);
      }

      throw error;
    }
  }

  /**
   * Execute a money transfer
   * 
   * Executes the actual money transfer after simulation. This method should
   * always be preceded by a simulation to ensure the user understands fees
   * and amounts. 2FA verification may be required based on user settings.
   * 
   * @param {Object} transferData - Transfer execution data
   * @param {string} transferData.fromAccountId - Source account identifier
   * @param {string} transferData.beneficiaryId - Destination beneficiary identifier
   * @param {number} transferData.amount - Amount to transfer
   * @param {string} [transferData.currency] - Transfer currency
   * @param {string} [transferData.reason] - Transfer description
   * @param {string} [transferData.reference] - Custom reference
   * @param {string} [transferData.smsCode] - SMS verification code (if required)
   * @param {string} [transferData.googleAuthCode] - Google Authenticator code (if required)
   * @returns {Promise<Object>} Transfer result
   * @returns {string} returns.transferId - Unique transfer identifier
   * @returns {string} returns.reference - Transfer reference number
   * @returns {string} returns.status - Transfer status (PENDING, PROCESSING, COMPLETED)
   * @returns {number} returns.amountSent - Amount deducted from account
   * @returns {number} returns.amountReceived - Amount received by recipient
   * @returns {number} returns.fees - Fees charged for transfer
   * @returns {Date} returns.createdAt - Transfer creation timestamp
   * @returns {Date} returns.estimatedArrival - Estimated arrival time
   * @returns {Object} returns.recipient - Recipient information
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {ValidationError} When transfer data is invalid or 2FA code is missing
   * @throws {TransferError} When transfer execution fails
   * @throws {InsufficientFundsError} When account has insufficient funds
   * 
   * @example
   * // Execute transfer with SMS 2FA
   * try {
   *   // First simulate to get exact amounts
   *   const simulation = await sdk.transfers.simulate(transferData);
   *   
   *   // Request SMS code if required
   *   if (simulation.requires2FA) {
   *     await sdk.auth.requestSMSCode(userPhoneNumber);
   *     const smsCode = await promptUserForSMSCode();
   *     transferData.smsCode = smsCode;
   *   }
   *   
   *   // Execute the transfer
   *   const result = await sdk.transfers.execute(transferData);
   *   
   *   console.log('Transfer successful!');
   *   console.log(`Transfer ID: ${result.transferId}`);
   *   console.log(`Reference: ${result.reference}`);
   *   console.log(`Status: ${result.status}`);
   *   console.log(`Amount sent: ${formatCurrency(result.amountSent, 'USD')}`);
   *   
   * } catch (error) {
   *   if (error instanceof TransferError) {
   *     console.error('Transfer failed:', error.message);
   *   } else if (error instanceof ValidationError) {
   *     console.error('Invalid 2FA code or missing information');
   *   }
   * }
   * 
   * @example
   * // Complete transfer workflow in a web application
   * const executeTransferWorkflow = async (transferData) => {
   *   try {
   *     // Step 1: Simulate transfer
   *     showLoadingSpinner('Calculating fees...');
   *     const simulation = await sdk.transfers.simulate(transferData);
   *     hideLoadingSpinner();
   *     
   *     // Step 2: Show confirmation to user
   *     const confirmed = await showTransferConfirmation({
   *       amount: simulation.amountToPay,
   *       fees: simulation.fees,
   *       recipient: simulation.recipient
   *     });
   *     
   *     if (!confirmed) return;
   *     
   *     // Step 3: Handle 2FA if required
   *     if (simulation.requires2FA) {
   *       await handle2FAVerification(transferData);
   *     }
   *     
   *     // Step 4: Execute transfer
   *     showLoadingSpinner('Processing transfer...');
   *     const result = await sdk.transfers.execute(transferData);
   *     hideLoadingSpinner();
   *     
   *     // Step 5: Show success message
   *     showSuccessMessage(`Transfer completed! Reference: ${result.reference}`);
   *     
   *     return result;
   *   } catch (error) {
   *     hideLoadingSpinner();
   *     showErrorMessage(error.message);
   *     throw error;
   *   }
   * };
   */
  async execute(transferData) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    // Validate transfer data
    this._validateTransferData(transferData);

    const {
      fromAccountId,
      beneficiaryId,
      amount,
      currency,
      reason = '',
      reference,
      smsCode,
      googleAuthCode
    } = transferData;

    try {
      // Prepare API payload
      const payload = {
        accountId: fromAccountId,
        destinationAccount: beneficiaryId,
        amount: convertToCentavos(amount),
        currency: currency,
        concept: reason,
        reference: reference || generateReference('TXN')
      };

      // Add 2FA codes if provided
      if (smsCode) {
        payload.smsCode = smsCode;
      }
      
      if (googleAuthCode) {
        payload.googleAuthCode = googleAuthCode;
      }

      const response = await this._httpClient.post(ENDPOINTS.TRANSFER_EXECUTE, payload);
      const transferResult = response.data;

      // Process transfer result
      const result = this._processTransferResponse(transferResult);

      if (this.sdk.config.debug) {
        console.log('✅ Transfer executed successfully', {
          transferId: result.transferId,
          amount: amount,
          status: result.status
        });
      }

      // Emit transfer completed event
      this.sdk.emit('transferCompleted', result);

      return result;

    } catch (error) {
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        if (errorData?.code === 'INSUFFICIENT_FUNDS') {
          throw new InsufficientFundsError(
            'Insufficient funds for this transfer',
            {
              available: convertFromCentavos(errorData.available || 0),
              required: amount
            }
          );
        }
        
        if (errorData?.code === 'INVALID_2FA_CODE') {
          throw new ValidationError('Invalid 2FA verification code');
        }
        
        if (errorData?.code === '2FA_REQUIRED') {
          throw new ValidationError('2FA verification is required for this transfer');
        }
        
        throw new TransferError(errorData?.message || 'Transfer execution failed');
      }

      if (error.response?.status === 422) {
        throw new ValidationError('Transfer validation failed', error.response.data?.errors);
      }

      if (this.sdk.config.debug) {
        console.error('❌ Transfer execution failed:', error.message);
      }

      // Emit transfer failed event
      this.sdk.emit('transferFailed', { error, transferData });

      throw new TransferError(`Transfer execution failed: ${error.message}`);
    }
  }

  /**
   * Get transfer status and details
   * 
   * @param {string} transferId - Transfer identifier
   * @returns {Promise<Object>} Transfer details and current status
   * 
   * @example
   * // Track transfer status
   * const transfer = await sdk.transfers.getStatus('txn_123');
   * console.log(`Transfer status: ${transfer.status}`);
   * if (transfer.status === 'COMPLETED') {
   *   console.log('Transfer has been completed successfully');
   * }
   */
  async getStatus(transferId) {
    if (!transferId || typeof transferId !== 'string') {
      throw new ValidationError('Transfer ID is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const response = await this._httpClient.get(`/transfers/${transferId}`);
      return this._processTransferResponse(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new TransferError(`Transfer not found: ${transferId}`);
      }
      throw error;
    }
  }

  /**
   * Cancel a pending transfer
   * 
   * @param {string} transferId - Transfer identifier
   * @returns {Promise<Object>} Cancellation result
   * 
   * @example
   * // Cancel a pending transfer
   * try {
   *   const result = await sdk.transfers.cancel('txn_123');
   *   console.log('Transfer cancelled:', result.status);
   * } catch (error) {
   *   console.error('Cannot cancel transfer:', error.message);
   * }
   */
  async cancel(transferId) {
    if (!transferId || typeof transferId !== 'string') {
      throw new ValidationError('Transfer ID is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const response = await this._httpClient.post(`/transfers/${transferId}/cancel`);
      
      const result = this._processTransferResponse(response.data);
      
      // Emit transfer cancelled event
      this.sdk.emit('transferCancelled', result);
      
      return result;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new TransferError('Transfer cannot be cancelled - it may have already been processed');
      }
      if (error.response?.status === 404) {
        throw new TransferError(`Transfer not found: ${transferId}`);
      }
      throw error;
    }
  }

  /**
   * Get transfer history
   * 
   * @param {Object} [options] - Query options
   * @param {number} [options.offset=0] - Number of records to skip
   * @param {number} [options.limit=20] - Maximum records to return
   * @param {Date} [options.startDate] - Filter transfers from this date
   * @param {Date} [options.endDate] - Filter transfers until this date
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.accountId] - Filter by source account
   * @returns {Promise<Array<Object>>} Array of transfer records
   * 
   * @example
   * // Get recent transfers
   * const transfers = await sdk.transfers.getHistory({
   *   limit: 10,
   *   status: 'COMPLETED'
   * });
   * 
   * transfers.forEach(transfer => {
   *   console.log(`${transfer.createdAt.toLocaleDateString()}: ${transfer.amount} to ${transfer.recipient.name}`);
   * });
   */
  async getHistory(options = {}) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    const {
      offset = 0,
      limit = 20,
      startDate,
      endDate,
      status,
      accountId
    } = options;

    const params = { offset, limit };
    
    if (startDate) {
      params.start_date = startDate.toISOString().split('T')[0];
    }
    
    if (endDate) {
      params.end_date = endDate.toISOString().split('T')[0];
    }
    
    if (status) {
      params.status = status;
    }
    
    if (accountId) {
      params.account_id = accountId;
    }

    try {
      const response = await this._httpClient.get('/transfers', { params });
      const transfers = Array.isArray(response.data) ? response.data : response.data?.rows || [];
      
      return transfers.map(transfer => this._processTransferResponse(transfer));
    } catch (error) {
      if (this.sdk.config.debug) {
        console.error('❌ Failed to fetch transfer history:', error.message);
      }
      throw error;
    }
  }

  /**
   * Request SMS code for 2FA verification
   * 
   * @param {string} phoneNumber - Phone number to send SMS to
   * @returns {Promise<Object>} SMS request result
   * 
   * @example
   * // Request SMS verification
   * const result = await sdk.transfers.requestSMSCode('+1234567890');
   * console.log('SMS sent:', result.message);
   */
  async requestSMSCode(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new ValidationError('Phone number is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const response = await this._httpClient.post(ENDPOINTS.SMS_SEND, {
        phoneNumber: phoneNumber
      });

      return response.data;
    } catch (error) {
      if (this.sdk.config.debug) {
        console.error('❌ Failed to request SMS code:', error.message);
      }
      throw error;
    }
  }

  /**
   * Validate transfer data
   * @private
   */
  _validateTransferData(transferData) {
    if (!transferData || typeof transferData !== 'object') {
      throw new ValidationError('Transfer data is required');
    }

    const { fromAccountId, beneficiaryId, amount, currency } = transferData;

    if (!fromAccountId || typeof fromAccountId !== 'string') {
      throw new ValidationError('From account ID is required');
    }

    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      throw new ValidationError('Beneficiary ID is required');
    }

    if (!isValidAmount(amount, { min: 0.01 })) {
      throw new ValidationError('Amount must be a positive number greater than 0.01');
    }

    if (currency && !isValidCurrency(currency)) {
      throw new ValidationError(`Invalid currency: ${currency}`);
    }
  }

  /**
   * Process simulation response from API
   * @private
   */
  _processSimulationResponse(simulationData) {
    return {
      amountToPay: convertFromCentavos(simulationData.amountToPay || 0),
      amountToReceive: convertFromCentavos(simulationData.amountToGet || simulationData.amountToReceive || 0),
      fees: convertFromCentavos(simulationData.fees || 0),
      exchangeRate: simulationData.exchangeRate || 1,
      fromCurrency: simulationData.fromCurrency || simulationData.sourceCurrency,
      toCurrency: simulationData.toCurrency || simulationData.destinationCurrency,
      requires2FA: simulationData.requires2FA || simulationData.requiresSMS || false,
      accountBalanceAfter: convertFromCentavos(simulationData.accountLeftBalance || 0),
      estimatedArrival: simulationData.estimatedArrival || '1-3 business days',
      breakdown: {
        baseFee: convertFromCentavos(simulationData.baseFee || 0),
        exchangeFee: convertFromCentavos(simulationData.exchangeFee || 0),
        internationalFee: convertFromCentavos(simulationData.internationalFee || 0)
      },
      recipient: simulationData.recipient || {}
    };
  }

  /**
   * Process transfer response from API
   * @private
   */
  _processTransferResponse(transferData) {
    return {
      transferId: transferData.id || transferData.transferId,
      reference: transferData.reference || transferData.externalId,
      status: transferData.status,
      amountSent: convertFromCentavos(transferData.amount || transferData.amountSent || 0),
      amountReceived: convertFromCentavos(transferData.destinationAmount || transferData.amountReceived || 0),
      fees: convertFromCentavos(transferData.fees || 0),
      createdAt: transferData.createdAt ? new Date(transferData.createdAt) : new Date(),
      updatedAt: transferData.updatedAt ? new Date(transferData.updatedAt) : null,
      estimatedArrival: transferData.estimatedArrival,
      recipient: transferData.recipient || transferData.beneficiary || {},
      currency: transferData.currency,
      type: transferData.type || 'TRANSFER',
      description: transferData.description || transferData.concept || ''
    };
  }
}

module.exports = TransfersModule;