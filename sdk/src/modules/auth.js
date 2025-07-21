/**
 * TropiPay SDK - Authentication Module
 * 
 * This module handles all authentication-related operations including
 * OAuth2 Client Credentials flow, token management, and user profile retrieval.
 * 
 * @author TropiPay Team
 * @version 1.0.0
 */

const { ENDPOINTS } = require('../utils/constants');
const { AuthenticationError, ValidationError } = require('../utils/errors');
const { convertFromCentavos } = require('../utils/helpers');

/**
 * Authentication Module
 * 
 * Handles OAuth2 authentication flow and user profile management
 * for TropiPay API integration.
 * 
 * @class AuthModule
 */
class AuthModule {
  /**
   * Create authentication module
   * 
   * @param {TropiPaySDK} sdk - Reference to main SDK instance
   */
  constructor(sdk) {
    this.sdk = sdk;
    this._httpClient = sdk._httpClient;
  }

  /**
   * Authenticate with TropiPay using Client Credentials flow
   * 
   * This method performs the complete OAuth2 authentication workflow:
   * 1. Exchanges client credentials for access token
   * 2. Retrieves user profile information
   * 3. Fetches user accounts with balance information
   * 4. Returns comprehensive authentication result
   * 
   * @param {string} clientId - TropiPay Client ID
   * @param {string} clientSecret - TropiPay Client Secret
   * @returns {Promise<Object>} Authentication result
   * @returns {string} returns.accessToken - OAuth2 access token
   * @returns {Date} returns.expiresAt - Token expiration date
   * @returns {Object} returns.profile - User profile information
   * @returns {Array} returns.accounts - User account information
   * 
   * @throws {AuthenticationError} When credentials are invalid
   * @throws {ValidationError} When parameters are invalid
   * 
   * @example
   * // Authenticate with Client Credentials
   * try {
   *   const result = await authModule.authenticate(
   *     'your_client_id',
   *     'your_client_secret'
   *   );
   *   
   *   console.log('Access Token:', result.accessToken);
   *   console.log('User Profile:', result.profile);
   *   console.log('Available Accounts:', result.accounts.length);
   *   console.log('Token expires at:', result.expiresAt);
   * } catch (error) {
   *   if (error instanceof AuthenticationError) {
   *     console.error('Authentication failed:', error.message);
   *   }
   * }
   * 
   * @example
   * // Handle authentication in a wallet application
   * const handleLogin = async (credentials) => {
   *   try {
   *     const auth = await sdk.auth.authenticate(
   *       credentials.clientId,
   *       credentials.clientSecret
   *     );
   *     
   *     // Store user session
   *     localStorage.setItem('user_session', JSON.stringify({
   *       userId: auth.profile.id,
   *       email: auth.profile.email,
   *       expiresAt: auth.expiresAt
   *     }));
   *     
   *     // Update UI with account information
   *     updateAccountsDisplay(auth.accounts);
   *     
   *     return auth;
   *   } catch (error) {
   *     showErrorMessage('Login failed: ' + error.message);
   *     throw error;
   *   }
   * };
   */
  async authenticate(clientId, clientSecret) {
    // Validate input parameters
    if (!clientId || typeof clientId !== 'string') {
      throw new ValidationError('clientId is required and must be a string');
    }

    if (!clientSecret || typeof clientSecret !== 'string') {
      throw new ValidationError('clientSecret is required and must be a string');
    }

    try {
      // Step 1: Get OAuth2 access token
      const tokenData = await this._getAccessToken(clientId.trim(), clientSecret.trim());
      
      // Step 2: Get user profile information
      const profile = await this._getUserProfile(tokenData.access_token);
      
      // Step 3: Get user accounts
      const accounts = await this._getUserAccounts(tokenData.access_token);

      // Step 4: Calculate token expiration
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const result = {
        accessToken: tokenData.access_token,
        expiresAt: expiresAt,
        profile: profile,
        accounts: accounts
      };

      if (this.sdk.config.debug) {
        console.log('✅ Authentication successful', {
          userId: profile.id,
          email: profile.email,
          accountsCount: accounts.length,
          expiresAt: expiresAt.toISOString()
        });
      }

      return result;

    } catch (error) {
      if (this.sdk.config.debug) {
        console.error('❌ Authentication failed:', error.message);
      }

      // Convert API errors to authentication errors
      if (error.response?.status === 401) {
        throw new AuthenticationError('Invalid client credentials');
      }
      
      if (error.response?.status === 403) {
        throw new AuthenticationError('Access forbidden. Check your credentials and permissions');
      }

      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Get OAuth2 access token from TropiPay
   * 
   * @private
   * @param {string} clientId - Client ID
   * @param {string} clientSecret - Client Secret
   * @returns {Promise<Object>} Token data
   */
  async _getAccessToken(clientId, clientSecret) {
    const response = await this._httpClient.post(ENDPOINTS.ACCESS_TOKEN, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });

    if (!response.data.access_token) {
      throw new AuthenticationError('Invalid response from authentication server');
    }

    return response.data;
  }

  /**
   * Get user profile information
   * 
   * @private
   * @param {string} accessToken - OAuth2 access token
   * @returns {Promise<Object>} User profile
   */
  async _getUserProfile(accessToken) {
    const response = await this._httpClient.get(ENDPOINTS.USER_PROFILE, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-DEVICE-ID': 'tropipay-sdk-js'
      }
    });

    return response.data;
  }

  /**
   * Get user accounts with balance information
   * 
   * @private
   * @param {string} accessToken - OAuth2 access token
   * @returns {Promise<Array>} User accounts
   */
  async _getUserAccounts(accessToken) {
    try {
      const response = await this._httpClient.get(ENDPOINTS.ACCOUNTS, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-DEVICE-ID': 'tropipay-sdk-js'
        }
      });

      const accounts = Array.isArray(response.data) ? response.data : [];
      
      // Convert amounts from centavos to display units
      return accounts.map(account => ({
        ...account,
        balance: convertFromCentavos(account.balance || 0),
        available: convertFromCentavos(account.available || account.balance || 0),
        blocked: convertFromCentavos(account.blocked || 0),
        pendingIn: convertFromCentavos(account.pendingIn || 0),
        pendingOut: convertFromCentavos(account.pendingOut || 0)
      }));

    } catch (error) {
      if (this.sdk.config.debug) {
        console.warn('⚠️ Failed to fetch accounts during authentication:', error.message);
      }
      
      // Return empty array if accounts fetch fails
      // This allows authentication to succeed even if account info is temporarily unavailable
      return [];
    }
  }

  /**
   * Refresh access token (if refresh token is available)
   * 
   * Note: TropiPay Client Credentials flow doesn't provide refresh tokens.
   * This method is included for API completeness and future enhancement.
   * 
   * @param {string} refreshToken - Refresh token (not used in Client Credentials flow)
   * @returns {Promise<Object>} New token data
   * @throws {AuthenticationError} Always, as refresh is not supported
   * 
   * @example
   * // This method is not supported in Client Credentials flow
   * try {
   *   await authModule.refreshToken('refresh_token');
   * } catch (error) {
   *   // Will always throw - need to re-authenticate
   *   await authModule.authenticate(clientId, clientSecret);
   * }
   */
  async refreshToken(refreshToken) {
    throw new AuthenticationError(
      'Token refresh is not supported in Client Credentials flow. ' +
      'Please re-authenticate using your client credentials.'
    );
  }

  /**
   * Validate current access token
   * 
   * This method validates the current token by making a test API call.
   * Useful for checking token validity before making important operations.
   * 
   * @param {string} accessToken - Token to validate
   * @returns {Promise<boolean>} True if token is valid
   * 
   * @example
   * // Validate token before making API calls
   * const isValid = await authModule.validateToken(currentToken);
   * if (!isValid) {
   *   // Token expired, need to re-authenticate
   *   await sdk.authenticate();
   * }
   * 
   * @example
   * // Use in middleware for token validation
   * const validateUserToken = async (req, res, next) => {
   *   const token = req.headers.authorization?.replace('Bearer ', '');
   *   
   *   if (!token) {
   *     return res.status(401).json({ error: 'No token provided' });
   *   }
   *   
   *   try {
   *     const isValid = await authModule.validateToken(token);
   *     if (isValid) {
   *       next();
   *     } else {
   *       res.status(401).json({ error: 'Invalid or expired token' });
   *     }
   *   } catch (error) {
   *     res.status(401).json({ error: 'Token validation failed' });
   *   }
   * };
   */
  async validateToken(accessToken) {
    if (!accessToken || typeof accessToken !== 'string') {
      return false;
    }

    try {
      await this._httpClient.get(ENDPOINTS.USER_PROFILE, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-DEVICE-ID': 'tropipay-sdk-js'
        }
      });
      
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        return false;
      }
      
      // Other errors might be temporary, so we consider token valid
      return true;
    }
  }

  /**
   * Get current user profile (requires authentication)
   * 
   * @returns {Promise<Object>} Current user profile
   * @throws {AuthenticationError} When not authenticated
   * 
   * @example
   * // Get current user profile
   * try {
   *   const profile = await authModule.getCurrentProfile();
   *   console.log('User ID:', profile.id);
   *   console.log('Email:', profile.email);
   *   console.log('KYC Level:', profile.kycLevel);
   *   console.log('2FA Type:', profile.twoFaType); // 1=SMS, 2=Google Authenticator
   * } catch (error) {
   *   console.error('Failed to get profile:', error.message);
   * }
   */
  async getCurrentProfile() {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    return await this._getUserProfile(this.sdk.getAccessToken());
  }

  /**
   * Update user profile information
   * 
   * @param {Object} profileData - Profile data to update
   * @param {string} [profileData.firstName] - First name
   * @param {string} [profileData.lastName] - Last name
   * @param {string} [profileData.phoneNumber] - Phone number
   * @param {string} [profileData.dateOfBirth] - Date of birth (YYYY-MM-DD)
   * @returns {Promise<Object>} Updated profile
   * @throws {AuthenticationError} When not authenticated
   * @throws {ValidationError} When profile data is invalid
   * 
   * @example
   * // Update user profile
   * const updatedProfile = await authModule.updateProfile({
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   phoneNumber: '+1234567890'
   * });
   * 
   * console.log('Profile updated:', updatedProfile);
   */
  async updateProfile(profileData) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    if (!profileData || typeof profileData !== 'object') {
      throw new ValidationError('Profile data is required');
    }

    try {
      const response = await this._httpClient.put(ENDPOINTS.USER_PROFILE, profileData, {
        headers: {
          'Authorization': `Bearer ${this.sdk.getAccessToken()}`,
          'X-DEVICE-ID': 'tropipay-sdk-js'
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        throw new ValidationError('Profile validation failed', error.response.data?.errors);
      }
      throw error;
    }
  }

  /**
   * Change user password
   * 
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success response
   * @throws {AuthenticationError} When not authenticated or current password is wrong
   * @throws {ValidationError} When passwords don't meet requirements
   * 
   * @example
   * // Change user password
   * try {
   *   await authModule.changePassword('currentPass123', 'newSecurePass456');
   *   console.log('Password changed successfully');
   * } catch (error) {
   *   if (error instanceof ValidationError) {
   *     console.error('Password requirements not met:', error.message);
   *   } else {
   *     console.error('Password change failed:', error.message);
   *   }
   * }
   */
  async changePassword(currentPassword, newPassword) {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated. Please call authenticate() first.');
    }

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Both current and new passwords are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    try {
      const response = await this._httpClient.post('/users/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${this.sdk.getAccessToken()}`,
          'X-DEVICE-ID': 'tropipay-sdk-js'
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new AuthenticationError('Current password is incorrect');
      }
      if (error.response?.status === 422) {
        throw new ValidationError('Password validation failed', error.response.data?.errors);
      }
      throw error;
    }
  }

  /**
   * Logout and invalidate current session
   * 
   * This method logs out the user and clears the current session.
   * Note: In Client Credentials flow, tokens can't be revoked server-side,
   * but this method clears the local session.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * // Logout user
   * await authModule.logout();
   * console.log('User logged out');
   */
  async logout() {
    try {
      // Attempt to revoke token (if endpoint exists)
      if (this.sdk.isAuthenticated()) {
        await this._httpClient.post('/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${this.sdk.getAccessToken()}`,
            'X-DEVICE-ID': 'tropipay-sdk-js'
          }
        });
      }
    } catch (error) {
      // Ignore errors during logout - we'll clear local session anyway
      if (this.sdk.config.debug) {
        console.warn('⚠️ Server logout failed, clearing local session:', error.message);
      }
    }

    // Clear local authentication state
    this.sdk.logout();
  }
}

module.exports = AuthModule;