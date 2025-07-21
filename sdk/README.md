# TropiPay Wallet SDK

**Official JavaScript SDK for TropiPay API Integration**

[![npm version](https://badge.fury.io/js/%40tropipay%2Fwallet-sdk.svg)](https://badge.fury.io/js/%40tropipay%2Fwallet-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@tropipay/wallet-sdk)](https://nodejs.org/)

Build powerful wallet and payment applications with TropiPay's comprehensive JavaScript SDK. This SDK provides a complete, easy-to-use interface for integrating TropiPay's payment services into your web and Node.js applications.

---

## 🚀 **Quick Start**

### Installation

```bash
npm install @tropipay/wallet-sdk
```

### Basic Usage

```javascript
const TropiPaySDK = require('@tropipay/wallet-sdk');

// Initialize SDK
const sdk = new TropiPaySDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'development' // or 'production'
});

// Authenticate
await sdk.authenticate();

// Get user accounts
const accounts = await sdk.accounts.getAll();

// Send money
const simulation = await sdk.transfers.simulate({
  fromAccountId: 'account_123',
  beneficiaryId: 'beneficiary_456',
  amount: 100.00
});

if (simulation.requires2FA) {
  await sdk.transfers.requestSMSCode('+1234567890');
  const smsCode = '123456'; // Get from user input
  
  const result = await sdk.transfers.execute({
    fromAccountId: 'account_123',
    beneficiaryId: 'beneficiary_456',
    amount: 100.00,
    smsCode: smsCode
  });
  
  console.log('Transfer completed:', result.transferId);
}
```

---

## 📋 **Features**

### ✅ **Complete API Coverage**
- **Authentication** - OAuth2 Client Credentials flow
- **Account Management** - Balance retrieval, account information, transaction history
- **Money Transfers** - Domestic and international transfers with 2FA support
- **Beneficiary Management** - Create and manage recipients for transfers
- **Multi-Currency** - Support for USD, EUR, CUP and more

### ✅ **Developer Experience**
- **Promise-based API** - Modern async/await support
- **Comprehensive Error Handling** - Detailed error types and messages
- **Built-in Validation** - Input validation with helpful error messages
- **Event System** - Listen to transfer events, authentication state changes
- **Debug Mode** - Detailed logging for development

### ✅ **Production Ready**
- **TypeScript Support** - Full type definitions included
- **Automatic Retries** - Configurable retry logic for network errors
- **Rate Limiting** - Built-in handling of API rate limits
- **Security** - Best practices for credential management

---

## 🏗️ **Architecture**

The SDK is organized into focused modules:

```javascript
const sdk = new TropiPaySDK(config);

// Authentication & User Management
await sdk.authenticate();
const profile = sdk.getUserProfile();

// Account Operations
const accounts = await sdk.accounts.getAll();
const balance = await sdk.accounts.getBalance('account_id');
const movements = await sdk.accounts.getMovements('account_id');

// Transfer Operations  
const simulation = await sdk.transfers.simulate(transferData);
const result = await sdk.transfers.execute(transferData);
const history = await sdk.transfers.getHistory();

// Beneficiary Management
const beneficiaries = await sdk.beneficiaries.getAll();
const newBeneficiary = await sdk.beneficiaries.create(beneficiaryData);
await sdk.beneficiaries.validateAccountNumber(validationData);
```

---

## 📖 **API Documentation**

### Authentication

```javascript
// Initialize with your TropiPay credentials
const sdk = new TropiPaySDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'development', // 'development' or 'production'
  timeout: 10000,           // Request timeout (optional)
  debug: true              // Enable debug logging (optional)
});

// Authenticate and get user information
const authResult = await sdk.authenticate();
console.log('User ID:', authResult.profile.id);
console.log('Available accounts:', authResult.accounts.length);

// Check authentication status
if (sdk.isAuthenticated()) {
  console.log('User is authenticated');
  console.log('Token expires:', sdk.getTokenExpiry());
}
```

### Account Management

```javascript
// Get all user accounts
const accounts = await sdk.accounts.getAll();

accounts.forEach(account => {
  console.log(`${account.currency} Account: $${account.balance}`);
  console.log(`Available: $${account.available}`);
  console.log(`Status: ${account.status}`);
});

// Get specific account
const account = await sdk.accounts.getById('account_123');

// Get accounts by currency
const usdAccounts = await sdk.accounts.getByCurrency('USD');

// Check account balance before transfer
const balanceCheck = await sdk.accounts.checkBalance('account_123', 100.00);
if (!balanceCheck.sufficient) {
  console.log(`Need $${balanceCheck.shortfall} more`);
}

// Get transaction history
const movements = await sdk.accounts.getMovements('account_123', {
  limit: 50,
  startDate: new Date('2024-01-01'),
  type: 'TRANSFER_OUT'
});

movements.forEach(movement => {
  console.log(`${movement.createdAt}: ${movement.amount} ${movement.currency}`);
  console.log(`Type: ${movement.type}, Status: ${movement.status}`);
});
```

### Money Transfers

```javascript
// Step 1: Simulate transfer to get fees and exchange rates
const simulation = await sdk.transfers.simulate({
  fromAccountId: 'usd_account_123',
  beneficiaryId: 'beneficiary_456',
  amount: 100.00,
  reason: 'Payment for services'
});

console.log('Transfer Summary:');
console.log(`Amount to pay: $${simulation.amountToPay}`);
console.log(`Recipient gets: €${simulation.amountToReceive}`);
console.log(`Fees: $${simulation.fees}`);
console.log(`Exchange rate: ${simulation.exchangeRate}`);
console.log(`2FA required: ${simulation.requires2FA}`);

// Step 2: Handle 2FA if required
if (simulation.requires2FA) {
  // Request SMS code
  await sdk.transfers.requestSMSCode('+1234567890');
  
  // Get code from user input
  const smsCode = await getUserInputSMSCode();
  
  // Execute transfer with 2FA
  const result = await sdk.transfers.execute({
    fromAccountId: 'usd_account_123',
    beneficiaryId: 'beneficiary_456',
    amount: 100.00,
    reason: 'Payment for services',
    smsCode: smsCode
  });
  
  console.log('Transfer completed!');
  console.log(`Transfer ID: ${result.transferId}`);
  console.log(`Reference: ${result.reference}`);
  console.log(`Status: ${result.status}`);
}

// Get transfer history
const transfers = await sdk.transfers.getHistory({
  limit: 20,
  status: 'COMPLETED'
});

// Track transfer status
const transfer = await sdk.transfers.getStatus('transfer_123');
console.log(`Transfer status: ${transfer.status}`);
```

### Beneficiary Management

```javascript
// Get all beneficiaries
const beneficiaries = await sdk.beneficiaries.getAll();

// Filter beneficiaries
const euroBeneficiaries = await sdk.beneficiaries.getAll({
  currency: 'EUR',
  country: 'ES'
});

// Search beneficiaries
const searchResults = await sdk.beneficiaries.search('John');

// Create internal TropiPay beneficiary
const internalBeneficiary = await sdk.beneficiaries.create({
  type: 'INTERNAL',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  accountNumber: 'john.doe@example.com',
  currency: 'USD',
  country: 'US',
  relationship: 'Friend'
});

// Create external bank beneficiary
const externalBeneficiary = await sdk.beneficiaries.create({
  type: 'EXTERNAL',
  firstName: 'Maria',
  lastName: 'Garcia',
  accountNumber: 'ES9121000418450200051332',
  currency: 'EUR',
  country: 'ES',
  bankDetails: {
    name: 'Banco Santander',
    swiftCode: 'BSCHESMM',
    address: 'Madrid, Spain'
  },
  address: '123 Main St, Madrid',
  phoneNumber: '+34666123456',
  relationship: 'Family'
});

// Validate account information
const accountValidation = await sdk.beneficiaries.validateAccountNumber({
  accountNumber: 'ES9121000418450200051332',
  country: 'ES'
});

if (accountValidation.valid) {
  console.log('Valid IBAN');
  console.log('Bank:', accountValidation.bankInfo?.name);
}

const swiftValidation = await sdk.beneficiaries.validateSwiftCode({
  swiftCode: 'BSCHESMM'
});

if (swiftValidation.valid) {
  console.log('Valid SWIFT code');
  console.log('Bank:', swiftValidation.bankInfo?.name);
}
```

---

## 🔧 **Configuration**

### Environment Configuration

```javascript
// Development environment (sandbox)
const devSDK = new TropiPaySDK({
  clientId: 'dev_client_id',
  clientSecret: 'dev_client_secret',
  environment: 'development',
  debug: true
});

// Production environment
const prodSDK = new TropiPaySDK({
  clientId: 'prod_client_id',
  clientSecret: 'prod_client_secret',
  environment: 'production',
  debug: false,
  timeout: 15000,
  retries: {
    enabled: true,
    max: 3,
    delay: 2000
  }
});
```

### Event Handling

```javascript
// Listen to SDK events
sdk.on('authenticated', (user) => {
  console.log('User authenticated:', user.profile.email);
});

sdk.on('transferCompleted', (transfer) => {
  console.log('Transfer completed:', transfer.transferId);
  updateUI(transfer);
});

sdk.on('transferFailed', (error) => {
  console.error('Transfer failed:', error.message);
  showErrorMessage(error.message);
});

sdk.on('tokenExpired', () => {
  console.log('Token expired, re-authenticating...');
  sdk.authenticate();
});

sdk.on('error', (error) => {
  console.error('SDK Error:', error.message);
});
```

---

## 🚨 **Error Handling**

The SDK provides detailed error types for better error handling:

```javascript
const { 
  TropiPayError,
  AuthenticationError,
  ValidationError,
  InsufficientFundsError,
  TransferError,
  NetworkError
} = require('@tropipay/wallet-sdk');

try {
  await sdk.transfers.execute(transferData);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed, please login again');
    redirectToLogin();
  } else if (error instanceof InsufficientFundsError) {
    console.error('Insufficient funds:', error.details.available);
    showInsufficientFundsMessage(error.details);
  } else if (error instanceof ValidationError) {
    console.error('Validation errors:', error.validationErrors);
    showValidationErrors(error.validationErrors);
  } else if (error instanceof TransferError) {
    console.error('Transfer failed:', error.message);
    showTransferErrorMessage(error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error, please try again');
    showRetryButton();
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## 💡 **Examples**

### Complete Wallet Application

```javascript
class WalletApp {
  constructor() {
    this.sdk = new TropiPaySDK({
      clientId: process.env.TROPIPAY_CLIENT_ID,
      clientSecret: process.env.TROPIPAY_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.sdk.on('authenticated', (user) => {
      this.updateUserProfile(user.profile);
      this.loadDashboard();
    });
    
    this.sdk.on('transferCompleted', (transfer) => {
      this.showSuccessMessage(`Transfer ${transfer.reference} completed!`);
      this.refreshAccountBalances();
    });
  }
  
  async login(credentials) {
    try {
      await this.sdk.authenticate();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async loadDashboard() {
    try {
      const [accounts, beneficiaries, recentTransfers] = await Promise.all([
        this.sdk.accounts.getAll(),
        this.sdk.beneficiaries.getAll({ limit: 10 }),
        this.sdk.transfers.getHistory({ limit: 5 })
      ]);
      
      this.renderDashboard({
        accounts,
        beneficiaries,
        recentTransfers
      });
    } catch (error) {
      this.showErrorMessage('Failed to load dashboard: ' + error.message);
    }
  }
  
  async sendMoney(transferData) {
    try {
      // Step 1: Simulate
      const simulation = await this.sdk.transfers.simulate(transferData);
      
      // Step 2: Show confirmation
      const confirmed = await this.showTransferConfirmation(simulation);
      if (!confirmed) return;
      
      // Step 3: Handle 2FA
      if (simulation.requires2FA) {
        await this.handle2FA(transferData);
      }
      
      // Step 4: Execute
      const result = await this.sdk.transfers.execute(transferData);
      
      return { success: true, transfer: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async handle2FA(transferData) {
    // Request SMS code
    await this.sdk.transfers.requestSMSCode(this.userProfile.phoneNumber);
    
    // Get code from user
    const smsCode = await this.promptForSMSCode();
    
    // Add code to transfer data
    transferData.smsCode = smsCode;
  }
}

// Initialize app
const app = new WalletApp();
```

### Express.js API Integration

```javascript
const express = require('express');
const TropiPaySDK = require('@tropipay/wallet-sdk');

const app = express();
app.use(express.json());

// Initialize SDK
const sdk = new TropiPaySDK({
  clientId: process.env.TROPIPAY_CLIENT_ID,
  clientSecret: process.env.TROPIPAY_CLIENT_SECRET,
  environment: process.env.TROPIPAY_ENV || 'development'
});

// Middleware to ensure authentication
const requireAuth = async (req, res, next) => {
  if (!sdk.isAuthenticated()) {
    try {
      await sdk.authenticate();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }
  next();
};

// Get user accounts
app.get('/api/accounts', requireAuth, async (req, res) => {
  try {
    const accounts = await sdk.accounts.getAll();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate transfer
app.post('/api/transfers/simulate', requireAuth, async (req, res) => {
  try {
    const simulation = await sdk.transfers.simulate(req.body);
    res.json(simulation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Execute transfer
app.post('/api/transfers/execute', requireAuth, async (req, res) => {
  try {
    const result = await sdk.transfers.execute(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get beneficiaries
app.get('/api/beneficiaries', requireAuth, async (req, res) => {
  try {
    const beneficiaries = await sdk.beneficiaries.getAll(req.query);
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Wallet API running on port 3000');
});
```

---

## 🔒 **Security Best Practices**

### Credential Management

```javascript
// ✅ DO: Use environment variables
const sdk = new TropiPaySDK({
  clientId: process.env.TROPIPAY_CLIENT_ID,
  clientSecret: process.env.TROPIPAY_CLIENT_SECRET,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
});

// ❌ DON'T: Hard-code credentials
const sdk = new TropiPaySDK({
  clientId: 'hardcoded_client_id',     // Never do this!
  clientSecret: 'hardcoded_secret'     // Never do this!
});
```

### Token Security

```javascript
// ✅ Check token validity before sensitive operations
if (!sdk.isAuthenticated()) {
  await sdk.authenticate();
}

// ✅ Handle token expiration gracefully
sdk.on('tokenExpired', async () => {
  try {
    await sdk.authenticate();
  } catch (error) {
    // Redirect to login
    window.location.href = '/login';
  }
});
```

### 2FA Implementation

```javascript
// ✅ Always use 2FA for transfers
const simulation = await sdk.transfers.simulate(transferData);

if (simulation.requires2FA) {
  // Request SMS code
  await sdk.transfers.requestSMSCode(userPhoneNumber);
  
  // Get code securely from user
  const smsCode = await securelyPromptForSMSCode();
  transferData.smsCode = smsCode;
}
```

---

## 🌍 **Multi-Environment Support**

### Development Environment

```javascript
const devSDK = new TropiPaySDK({
  clientId: 'dev_client_id',
  clientSecret: 'dev_client_secret',
  environment: 'development'
});

// Development features:
// - Sandbox API (https://sandbox.tropipay.me/api/v3)
// - Test data and accounts
// - Demo 2FA codes (123456)
// - Detailed logging
```

### Production Environment

```javascript
const prodSDK = new TropiPaySDK({
  clientId: 'prod_client_id',
  clientSecret: 'prod_client_secret',
  environment: 'production'
});

// Production features:
// - Live API (https://www.tropipay.com/api/v3)
// - Real money transactions
// - Actual SMS 2FA codes
// - Optimized performance
```

---

## 📊 **TypeScript Support**

The SDK includes comprehensive TypeScript definitions:

```typescript
import TropiPaySDK, { 
  AuthenticationResult,
  Account,
  TransferSimulation,
  Beneficiary,
  TropiPayError
} from '@tropipay/wallet-sdk';

const sdk = new TropiPaySDK({
  clientId: process.env.TROPIPAY_CLIENT_ID!,
  clientSecret: process.env.TROPIPAY_CLIENT_SECRET!,
  environment: 'development'
});

// Type-safe operations
const authResult: AuthenticationResult = await sdk.authenticate();
const accounts: Account[] = await sdk.accounts.getAll();
const simulation: TransferSimulation = await sdk.transfers.simulate({
  fromAccountId: 'account_123',
  beneficiaryId: 'beneficiary_456',
  amount: 100.00
});
```

---

## 🧪 **Testing**

### Unit Testing with Jest

```javascript
const TropiPaySDK = require('@tropipay/wallet-sdk');

describe('TropiPay SDK', () => {
  let sdk;
  
  beforeEach(() => {
    sdk = new TropiPaySDK({
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      environment: 'development'
    });
  });
  
  test('should authenticate successfully', async () => {
    const result = await sdk.authenticate();
    
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('profile');
    expect(result.accounts).toBeInstanceOf(Array);
  });
  
  test('should simulate transfer correctly', async () => {
    await sdk.authenticate();
    
    const simulation = await sdk.transfers.simulate({
      fromAccountId: 'account_123',
      beneficiaryId: 'beneficiary_456',
      amount: 100.00
    });
    
    expect(simulation).toHaveProperty('amountToPay');
    expect(simulation).toHaveProperty('fees');
    expect(simulation.amountToPay).toBeGreaterThan(100);
  });
});
```

### Integration Testing

```javascript
describe('Integration Tests', () => {
  test('complete transfer workflow', async () => {
    // 1. Authenticate
    await sdk.authenticate();
    
    // 2. Create beneficiary
    const beneficiary = await sdk.beneficiaries.create({
      type: 'INTERNAL',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      accountNumber: 'test@example.com',
      currency: 'USD',
      country: 'US'
    });
    
    // 3. Simulate transfer
    const simulation = await sdk.transfers.simulate({
      fromAccountId: 'account_123',
      beneficiaryId: beneficiary.id,
      amount: 10.00
    });
    
    // 4. Execute transfer (in test environment)
    const result = await sdk.transfers.execute({
      fromAccountId: 'account_123',
      beneficiaryId: beneficiary.id,
      amount: 10.00,
      smsCode: '123456' // Test code
    });
    
    expect(result.status).toBe('COMPLETED');
  });
});
```

---

## 📚 **API Reference**

### SDK Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientId` | `string` | **required** | TropiPay Client ID |
| `clientSecret` | `string` | **required** | TropiPay Client Secret |
| `environment` | `'development' \| 'production'` | `'development'` | API environment |
| `timeout` | `number` | `10000` | Request timeout (ms) |
| `debug` | `boolean` | `false` | Enable debug logging |
| `retries.enabled` | `boolean` | `true` | Enable automatic retries |
| `retries.max` | `number` | `3` | Maximum retry attempts |
| `retries.delay` | `number` | `1000` | Delay between retries (ms) |

### Error Types

| Error Class | Description |
|-------------|-------------|
| `TropiPayError` | Base error class |
| `AuthenticationError` | Authentication failures |
| `ValidationError` | Input validation errors |
| `InsufficientFundsError` | Insufficient account balance |
| `TransferError` | Transfer operation failures |
| `NetworkError` | Network connectivity issues |
| `RateLimitError` | API rate limit exceeded |

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `AuthResult` | User successfully authenticated |
| `tokenExpired` | - | Access token expired |
| `transferCompleted` | `Transfer` | Transfer successfully completed |
| `transferFailed` | `Error` | Transfer failed |
| `beneficiaryCreated` | `Beneficiary` | New beneficiary created |
| `error` | `Error` | General SDK error |

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/tropipay/wallet-sdk-js.git
cd wallet-sdk-js
npm install
npm test
```

### Running Examples

```bash
npm run example:basic
npm run example:wallet
npm run example:transfers
```

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 **Support**

- **Documentation**: [https://developer.tropipay.com/sdk/javascript](https://developer.tropipay.com/sdk/javascript)
- **API Reference**: [https://developer.tropipay.com/api](https://developer.tropipay.com/api)
- **Issues**: [GitHub Issues](https://github.com/tropipay/wallet-sdk-js/issues)
- **Email**: developers@tropipay.com

---

## 🔗 **Links**

- [TropiPay Developer Portal](https://developer.tropipay.com)
- [API Documentation](https://developer.tropipay.com/docs)
- [SDK Examples](https://github.com/tropipay/wallet-sdk-js/tree/main/examples)
- [Community Forum](https://community.tropipay.com)

---

**Built with ❤️ by the TropiPay Team**

*Happy coding! 🚀*