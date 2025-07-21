/**
 * TropiPay SDK - Beneficiaries Module
 * 
 * This module handles beneficiary management operations including creation,
 * retrieval, validation, and management of both internal TropiPay accounts
 * and external bank accounts for money transfers.
 * 
 * @author TropiPay Team
 * @version 1.0.0
 */

const { ENDPOINTS, BENEFICIARY_TYPES, COUNTRIES } = require('../utils/constants');
const { 
  AuthenticationError, 
  ValidationError, 
  TropiPayError 
} = require('../utils/errors');
const { 
  isValidEmail, 
  isValidPhone, 
  isValidIBAN, 
  isValidSWIFT,
  generateReference 
} = require('../utils/helpers');

/**
 * Beneficiaries Module
 * 
 * Provides comprehensive beneficiary management functionality for both
 * internal TropiPay accounts and external bank accounts worldwide.
 * 
 * @class BeneficiariesModule
 */
class BeneficiariesModule {
  /**
   * Create beneficiaries module
   * 
   * @param {TropiPaySDK} sdk - Reference to main SDK instance
   */
  constructor(sdk) {
    this.sdk = sdk;
    this._httpClient = sdk._httpClient;
  }

  /**
   * Get all beneficiaries
   * 
   * Retrieves all beneficiaries associated with the authenticated user,
   * including both internal TropiPay accounts and external bank accounts.
   * 
   * @param {Object} [options] - Query options
   * @param {number} [options.offset=0] - Number of records to skip
   * @param {number} [options.limit=50] - Maximum records to return (max 100)
   * @param {string} [options.type] - Filter by beneficiary type (INTERNAL/EXTERNAL)
   * @param {string} [options.currency] - Filter by currency
   * @param {string} [options.country] - Filter by country code
   * @param {string} [options.search] - Search by name, email, or account number
   * @returns {Promise<Array<Object>>} Array of beneficiary objects
   * @returns {string} returns[].id - Beneficiary identifier
   * @returns {string} returns[].type - Beneficiary type (INTERNAL/EXTERNAL)
   * @returns {string} returns[].name - Beneficiary full name
   * @returns {string} returns[].email - Email address (for internal accounts)
   * @returns {string} returns[].phoneNumber - Phone number
   * @returns {string} returns[].accountNumber - Account number or IBAN
   * @returns {string} returns[].currency - Account currency
   * @returns {string} returns[].country - Country code
   * @returns {Object} returns[].bankDetails - Bank information (for external accounts)
   * @returns {boolean} returns[].isVerified - Whether account is verified
   * @returns {Date} returns[].createdAt - Creation timestamp
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {ValidationError} When parameters are invalid
   * 
   * @example
   * // Get all beneficiaries
   * const beneficiaries = await sdk.beneficiaries.getAll();
   * 
   * beneficiaries.forEach(beneficiary => {
   *   console.log(`${beneficiary.name} (${beneficiary.type})`);
   *   console.log(`  Account: ${beneficiary.accountNumber}`);
   *   console.log(`  Currency: ${beneficiary.currency}`);
   *   console.log(`  Country: ${beneficiary.country}`);
   *   
   *   if (beneficiary.type === 'EXTERNAL' && beneficiary.bankDetails) {
   *     console.log(`  Bank: ${beneficiary.bankDetails.name}`);
   *     console.log(`  SWIFT: ${beneficiary.bankDetails.swiftCode}`);
   *   }
   * });
   * 
   * @example
   * // Get beneficiaries with filtering and search
   * const euroBeneficiaries = await sdk.beneficiaries.getAll({
   *   currency: 'EUR',
   *   type: 'EXTERNAL',
   *   search: 'Spain'
   * });
   * 
   * console.log(`Found ${euroBeneficiaries.length} EUR beneficiaries in Spain`);
   * 
   * @example
   * // Paginate through beneficiaries
   * const loadBeneficiariesPage = async (page = 1, pageSize = 20) => {
   *   const offset = (page - 1) * pageSize;
   *   
   *   const beneficiaries = await sdk.beneficiaries.getAll({
   *     offset,
   *     limit: pageSize
   *   });
   *   
   *   return {
   *     page,
   *     beneficiaries,
   *     hasMore: beneficiaries.length === pageSize
   *   };
   * };
   */
  async getAll(options = {}) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    const {
      offset = 0,
      limit = 50,
      type,
      currency,
      country,
      search
    } = options;

    // Validate parameters
    if (typeof offset !== 'number' || offset < 0) {
      throw new ValidationError('Offset must be a non-negative number');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (type && !Object.keys(BENEFICIARY_TYPES).includes(type)) {
      throw new ValidationError(`Invalid beneficiary type: ${type}`);
    }

    try {
      // Build query parameters
      const params = { offset, limit };
      
      if (type) params.type = type;
      if (currency) params.currency = currency;
      if (country) params.country = country;
      if (search) params.search = search;

      const response = await this._httpClient.get(ENDPOINTS.BENEFICIARIES, { params });
      
      // Handle different response formats
      let beneficiaries = [];
      if (response.data?.rows) {
        beneficiaries = response.data.rows;
      } else if (Array.isArray(response.data)) {
        beneficiaries = response.data;
      }

      // Process and enhance beneficiary data
      return beneficiaries.map(beneficiary => this._processBeneficiaryData(beneficiary));

    } catch (error) {
      if (this.sdk.config.debug) {
        console.error('❌ Failed to fetch beneficiaries:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get beneficiary by ID
   * 
   * @param {string} beneficiaryId - Beneficiary identifier
   * @returns {Promise<Object>} Beneficiary details
   * @throws {TropiPayError} When beneficiary is not found
   * 
   * @example
   * // Get specific beneficiary
   * const beneficiary = await sdk.beneficiaries.getById('beneficiary_123');
   * console.log('Beneficiary details:', beneficiary);
   */
  async getById(beneficiaryId) {
    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      throw new ValidationError('Beneficiary ID is required');
    }

    const beneficiaries = await this.getAll();
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);

    if (!beneficiary) {
      throw new TropiPayError(`Beneficiary not found: ${beneficiaryId}`, 'BENEFICIARY_NOT_FOUND');
    }

    return beneficiary;
  }

  /**
   * Create new beneficiary
   * 
   * Creates a new beneficiary for money transfers. Supports both internal
   * TropiPay accounts and external bank accounts worldwide.
   * 
   * @param {Object} beneficiaryData - Beneficiary information
   * @param {string} beneficiaryData.type - Beneficiary type ('INTERNAL' or 'EXTERNAL')
   * @param {string} beneficiaryData.firstName - First name
   * @param {string} beneficiaryData.lastName - Last name
   * @param {string} [beneficiaryData.email] - Email address (required for internal accounts)
   * @param {string} [beneficiaryData.phoneNumber] - Phone number
   * @param {string} beneficiaryData.accountNumber - Account number, IBAN, or email (for internal)
   * @param {string} beneficiaryData.currency - Account currency
   * @param {string} beneficiaryData.country - Country code (ISO 2-letter)
   * @param {Object} [beneficiaryData.bankDetails] - Bank information (for external accounts)
   * @param {string} [beneficiaryData.bankDetails.name] - Bank name
   * @param {string} [beneficiaryData.bankDetails.swiftCode] - SWIFT/BIC code
   * @param {string} [beneficiaryData.bankDetails.routingNumber] - Routing number (US banks)
   * @param {string} [beneficiaryData.bankDetails.address] - Bank address
   * @param {string} [beneficiaryData.address] - Beneficiary address
   * @param {string} [beneficiaryData.city] - City
   * @param {string} [beneficiaryData.postalCode] - Postal/ZIP code
   * @param {string} [beneficiaryData.relationship] - Relationship to sender
   * @param {string} [beneficiaryData.purpose] - Transfer purpose
   * @returns {Promise<Object>} Created beneficiary information
   * 
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {ValidationError} When beneficiary data is invalid
   * 
   * @example
   * // Create internal TropiPay beneficiary
   * const internalBeneficiary = await sdk.beneficiaries.create({
   *   type: 'INTERNAL',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   email: 'john.doe@example.com',
   *   accountNumber: 'john.doe@example.com', // Email for internal accounts
   *   currency: 'USD',
   *   country: 'US',
   *   relationship: 'Friend',
   *   purpose: 'Personal transfer'
   * });
   * 
   * console.log('Internal beneficiary created:', internalBeneficiary.id);
   * 
   * @example
   * // Create external bank beneficiary
   * const externalBeneficiary = await sdk.beneficiaries.create({
   *   type: 'EXTERNAL',
   *   firstName: 'Maria',
   *   lastName: 'Garcia',
   *   phoneNumber: '+34666123456',
   *   accountNumber: 'ES9121000418450200051332', // IBAN
   *   currency: 'EUR',
   *   country: 'ES',
   *   bankDetails: {
   *     name: 'Banco Santander',
   *     swiftCode: 'BSCHESMM',
   *     address: 'Madrid, Spain'
   *   },
   *   address: '123 Main St, Madrid',
   *   city: 'Madrid',
   *   postalCode: '28001',
   *   relationship: 'Family',
   *   purpose: 'Family support'
   * });
   * 
   * console.log('External beneficiary created:', externalBeneficiary.id);
   * 
   * @example
   * // Create beneficiary with validation
   * const createBeneficiaryWithValidation = async (data) => {
   *   try {
   *     // Pre-validate data
   *     if (data.type === 'EXTERNAL' && data.accountNumber) {
   *       const isValidAccount = await sdk.beneficiaries.validateAccountNumber({
   *         accountNumber: data.accountNumber,
   *         country: data.country
   *       });
   *       
   *       if (!isValidAccount.valid) {
   *         throw new Error('Invalid account number: ' + isValidAccount.message);
   *       }
   *     }
   *     
   *     if (data.bankDetails?.swiftCode) {
   *       const isValidSwift = await sdk.beneficiaries.validateSwiftCode({
   *         swiftCode: data.bankDetails.swiftCode
   *       });
   *       
   *       if (!isValidSwift.valid) {
   *         throw new Error('Invalid SWIFT code: ' + isValidSwift.message);
   *       }
   *     }
   *     
   *     // Create beneficiary
   *     return await sdk.beneficiaries.create(data);
   *   } catch (error) {
   *     console.error('Beneficiary creation failed:', error.message);
   *     throw error;
   *   }
   * };
   */
  async create(beneficiaryData) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    // Validate beneficiary data
    this._validateBeneficiaryData(beneficiaryData);

    try {
      // Prepare API payload
      const payload = this._prepareBeneficiaryPayload(beneficiaryData);

      const response = await this._httpClient.post(ENDPOINTS.BENEFICIARIES, payload);
      const createdBeneficiary = this._processBeneficiaryData(response.data);

      if (this.sdk.config.debug) {
        console.log('✅ Beneficiary created successfully', {
          id: createdBeneficiary.id,
          name: createdBeneficiary.name,
          type: createdBeneficiary.type
        });
      }

      // Emit beneficiary created event
      this.sdk.emit('beneficiaryCreated', createdBeneficiary);

      return createdBeneficiary;

    } catch (error) {
      if (error.response?.status === 422) {
        throw new ValidationError('Beneficiary validation failed', error.response.data?.errors);
      }

      if (error.response?.status === 409) {
        throw new ValidationError('Beneficiary already exists with this account information');
      }

      if (this.sdk.config.debug) {
        console.error('❌ Failed to create beneficiary:', error.message);
      }

      throw error;
    }
  }

  /**
   * Update existing beneficiary
   * 
   * @param {string} beneficiaryId - Beneficiary identifier
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated beneficiary information
   * 
   * @example
   * // Update beneficiary information
   * const updated = await sdk.beneficiaries.update('beneficiary_123', {
   *   phoneNumber: '+34666999888',
   *   address: 'New address, Madrid',
   *   relationship: 'Business partner'
   * });
   */
  async update(beneficiaryId, updateData) {
    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      throw new ValidationError('Beneficiary ID is required');
    }

    if (!updateData || typeof updateData !== 'object') {
      throw new ValidationError('Update data is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const response = await this._httpClient.put(
        `${ENDPOINTS.BENEFICIARIES}/${beneficiaryId}`, 
        updateData
      );

      const updatedBeneficiary = this._processBeneficiaryData(response.data);

      // Emit beneficiary updated event
      this.sdk.emit('beneficiaryUpdated', updatedBeneficiary);

      return updatedBeneficiary;

    } catch (error) {
      if (error.response?.status === 404) {
        throw new TropiPayError(`Beneficiary not found: ${beneficiaryId}`, 'BENEFICIARY_NOT_FOUND');
      }

      if (error.response?.status === 422) {
        throw new ValidationError('Update validation failed', error.response.data?.errors);
      }

      throw error;
    }
  }

  /**
   * Delete beneficiary
   * 
   * @param {string} beneficiaryId - Beneficiary identifier
   * @returns {Promise<Object>} Deletion result
   * 
   * @example
   * // Delete beneficiary
   * await sdk.beneficiaries.delete('beneficiary_123');
   * console.log('Beneficiary deleted successfully');
   */
  async delete(beneficiaryId) {
    if (!beneficiaryId || typeof beneficiaryId !== 'string') {
      throw new ValidationError('Beneficiary ID is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      await this._httpClient.delete(`${ENDPOINTS.BENEFICIARIES}/${beneficiaryId}`);

      // Emit beneficiary deleted event
      this.sdk.emit('beneficiaryDeleted', { beneficiaryId });

      return { success: true, beneficiaryId };

    } catch (error) {
      if (error.response?.status === 404) {
        throw new TropiPayError(`Beneficiary not found: ${beneficiaryId}`, 'BENEFICIARY_NOT_FOUND');
      }

      throw error;
    }
  }

  /**
   * Validate account number
   * 
   * Validates an account number or IBAN for a specific country and bank.
   * 
   * @param {Object} validationData - Validation data
   * @param {string} validationData.accountNumber - Account number or IBAN to validate
   * @param {string} validationData.country - Country code
   * @param {string} [validationData.bankCode] - Bank code (if known)
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} returns.valid - Whether account number is valid
   * @returns {string} returns.message - Validation message
   * @returns {Object} [returns.bankInfo] - Bank information (if found)
   * 
   * @example
   * // Validate IBAN
   * const validation = await sdk.beneficiaries.validateAccountNumber({
   *   accountNumber: 'ES9121000418450200051332',
   *   country: 'ES'
   * });
   * 
   * if (validation.valid) {
   *   console.log('Valid IBAN');
   *   if (validation.bankInfo) {
   *     console.log('Bank:', validation.bankInfo.name);
   *     console.log('Branch:', validation.bankInfo.branch);
   *   }
   * } else {
   *   console.error('Invalid IBAN:', validation.message);
   * }
   */
  async validateAccountNumber(validationData) {
    if (!validationData || typeof validationData !== 'object') {
      throw new ValidationError('Validation data is required');
    }

    const { accountNumber, country, bankCode } = validationData;

    if (!accountNumber || typeof accountNumber !== 'string') {
      throw new ValidationError('Account number is required');
    }

    if (!country || typeof country !== 'string') {
      throw new ValidationError('Country code is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const payload = {
        accountNumber: accountNumber.trim(),
        country: country.toUpperCase(),
        ...(bankCode && { bankCode })
      };

      const response = await this._httpClient.post(
        ENDPOINTS.BENEFICIARY_VALIDATE_ACCOUNT,
        payload
      );

      return response.data;

    } catch (error) {
      if (error.response?.status === 400) {
        return {
          valid: false,
          message: error.response.data?.message || 'Invalid account number'
        };
      }

      throw error;
    }
  }

  /**
   * Validate SWIFT/BIC code
   * 
   * @param {Object} validationData - Validation data
   * @param {string} validationData.swiftCode - SWIFT/BIC code to validate
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} returns.valid - Whether SWIFT code is valid
   * @returns {string} returns.message - Validation message
   * @returns {Object} [returns.bankInfo] - Bank information
   * 
   * @example
   * // Validate SWIFT code
   * const validation = await sdk.beneficiaries.validateSwiftCode({
   *   swiftCode: 'BSCHESMM'
   * });
   * 
   * if (validation.valid) {
   *   console.log('Valid SWIFT code');
   *   console.log('Bank:', validation.bankInfo?.name);
   *   console.log('Country:', validation.bankInfo?.country);
   * }
   */
  async validateSwiftCode(validationData) {
    if (!validationData || typeof validationData !== 'object') {
      throw new ValidationError('Validation data is required');
    }

    const { swiftCode } = validationData;

    if (!swiftCode || typeof swiftCode !== 'string') {
      throw new ValidationError('SWIFT code is required');
    }

    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    try {
      const payload = {
        swiftCode: swiftCode.trim().toUpperCase()
      };

      const response = await this._httpClient.post(
        ENDPOINTS.BENEFICIARY_VALIDATE_SWIFT,
        payload
      );

      return response.data;

    } catch (error) {
      if (error.response?.status === 400) {
        return {
          valid: false,
          message: error.response.data?.message || 'Invalid SWIFT code'
        };
      }

      throw error;
    }
  }

  /**
   * Search beneficiaries
   * 
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Array<Object>>} Matching beneficiaries
   * 
   * @example
   * // Search beneficiaries by name
   * const results = await sdk.beneficiaries.search('John');
   * console.log(`Found ${results.length} beneficiaries matching "John"`);
   */
  async search(query, options = {}) {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    return await this.getAll({
      ...options,
      search: query.trim()
    });
  }

  /**
   * Validate beneficiary data
   * @private
   */
  _validateBeneficiaryData(data) {
    const { type, firstName, lastName, accountNumber, currency, country } = data;

    if (!type || !Object.keys(BENEFICIARY_TYPES).includes(type)) {
      throw new ValidationError('Valid beneficiary type is required (INTERNAL or EXTERNAL)');
    }

    if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
      throw new ValidationError('First name is required');
    }

    if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
      throw new ValidationError('Last name is required');
    }

    if (!accountNumber || typeof accountNumber !== 'string') {
      throw new ValidationError('Account number is required');
    }

    if (!currency || typeof currency !== 'string') {
      throw new ValidationError('Currency is required');
    }

    if (!country || typeof country !== 'string' || country.length !== 2) {
      throw new ValidationError('Valid country code is required (ISO 2-letter)');
    }

    // Additional validation for internal accounts
    if (type === 'INTERNAL') {
      if (data.email && !isValidEmail(data.email)) {
        throw new ValidationError('Valid email address is required for internal accounts');
      }
    }

    // Additional validation for external accounts
    if (type === 'EXTERNAL') {
      if (data.bankDetails?.swiftCode && !isValidSWIFT(data.bankDetails.swiftCode)) {
        throw new ValidationError('Valid SWIFT/BIC code is required');
      }

      // Basic IBAN validation for European accounts
      if (country && ['ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'PT'].includes(country.toUpperCase())) {
        if (!isValidIBAN(accountNumber)) {
          throw new ValidationError('Valid IBAN is required for this country');
        }
      }
    }

    // Validate phone number if provided
    if (data.phoneNumber && !isValidPhone(data.phoneNumber)) {
      throw new ValidationError('Valid phone number format is required');
    }

    // Validate email if provided
    if (data.email && !isValidEmail(data.email)) {
      throw new ValidationError('Valid email address format is required');
    }
  }

  /**
   * Prepare beneficiary payload for API
   * @private
   */
  _prepareBeneficiaryPayload(data) {
    const payload = {
      type: data.type,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      name: `${data.firstName.trim()} ${data.lastName.trim()}`,
      accountNumber: data.accountNumber.trim(),
      currency: data.currency.toUpperCase(),
      country: data.country.toUpperCase(),
      isVerified: false
    };

    // Add optional fields
    if (data.email) payload.email = data.email.trim();
    if (data.phoneNumber) payload.phoneNumber = data.phoneNumber.trim();
    if (data.address) payload.address = data.address.trim();
    if (data.city) payload.city = data.city.trim();
    if (data.postalCode) payload.postalCode = data.postalCode.trim();
    if (data.relationship) payload.relationship = data.relationship.trim();
    if (data.purpose) payload.purpose = data.purpose.trim();

    // Add bank details for external accounts
    if (data.type === 'EXTERNAL' && data.bankDetails) {
      payload.bankDetails = {
        name: data.bankDetails.name?.trim(),
        swiftCode: data.bankDetails.swiftCode?.trim().toUpperCase(),
        routingNumber: data.bankDetails.routingNumber?.trim(),
        address: data.bankDetails.address?.trim()
      };
    }

    return payload;
  }

  /**
   * Process beneficiary data from API
   * @private
   */
  _processBeneficiaryData(beneficiary) {
    return {
      id: beneficiary.id,
      type: beneficiary.type || 'EXTERNAL',
      name: beneficiary.name || `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim(),
      firstName: beneficiary.firstName,
      lastName: beneficiary.lastName,
      email: beneficiary.email,
      phoneNumber: beneficiary.phoneNumber,
      accountNumber: beneficiary.accountNumber,
      currency: beneficiary.currency,
      country: beneficiary.country,
      countryName: COUNTRIES[beneficiary.country]?.name,
      bankDetails: beneficiary.bankDetails || {},
      address: beneficiary.address,
      city: beneficiary.city,
      postalCode: beneficiary.postalCode,
      relationship: beneficiary.relationship,
      purpose: beneficiary.purpose,
      isVerified: beneficiary.isVerified || false,
      isActive: beneficiary.isActive !== false,
      createdAt: beneficiary.createdAt ? new Date(beneficiary.createdAt) : new Date(),
      updatedAt: beneficiary.updatedAt ? new Date(beneficiary.updatedAt) : null
    };
  }
}

module.exports = BeneficiariesModule;