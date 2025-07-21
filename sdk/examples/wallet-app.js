/**
 * TropiPay SDK - Complete Wallet Application Example
 * 
 * This example demonstrates how to build a complete wallet application
 * using the TropiPay SDK. It includes user management, account operations,
 * transfers with 2FA, beneficiary management, and error handling.
 * 
 * This is production-ready code that you can adapt for your own wallet app.
 * 
 * To run this example:
 * 1. Set environment variables: TROPIPAY_CLIENT_ID, TROPIPAY_CLIENT_SECRET
 * 2. Run: node examples/wallet-app.js
 */

const TropiPaySDK = require('../src/index');
const readline = require('readline');

/**
 * Complete Wallet Application Class
 */
class TropiPayWalletApp {
  constructor() {
    // Initialize SDK
    this.sdk = new TropiPaySDK({
      clientId: process.env.TROPIPAY_CLIENT_ID || 'your_client_id',
      clientSecret: process.env.TROPIPAY_CLIENT_SECRET || 'your_client_secret',
      environment: 'development',
      debug: false, // Set to true for detailed API logging
      retries: {
        enabled: true,
        max: 3,
        delay: 2000
      }
    });
    
    // Initialize CLI interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Application state
    this.user = null;
    this.accounts = [];
    this.beneficiaries = [];
    this.isRunning = false;
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup SDK event listeners
   */
  setupEventListeners() {
    this.sdk.on('authenticated', (user) => {
      console.log(`✅ Welcome back, ${user.profile.firstName || user.profile.email}!`);
      this.user = user;
    });
    
    this.sdk.on('transferCompleted', (transfer) => {
      console.log(`\n🎉 Transfer completed successfully!`);
      console.log(`   Transfer ID: ${transfer.transferId}`);
      console.log(`   Reference: ${transfer.reference}`);
      console.log(`   Status: ${transfer.status}`);
      this.showNotification('Transfer completed successfully! ✅');
    });
    
    this.sdk.on('transferFailed', ({ error, transferData }) => {
      console.log(`\n❌ Transfer failed: ${error.message}`);
      this.showNotification(`Transfer failed: ${error.message} ❌`);
    });
    
    this.sdk.on('tokenExpired', () => {
      console.log('\n⚠️  Your session has expired. Please login again.');
      this.user = null;
    });
    
    this.sdk.on('error', (error) => {
      console.error(`\n🚨 SDK Error: ${error.message}`);
    });
  }
  
  /**
   * Start the wallet application
   */
  async start() {
    this.isRunning = true;
    
    console.log('🏦 ===============================================');
    console.log('🏦   TROPIPAY WALLET - DEMO APPLICATION        ');
    console.log('🏦 ===============================================');
    console.log('');
    
    try {
      // Check if we need to authenticate
      if (!this.sdk.isAuthenticated()) {
        await this.authenticate();
      }
      
      // Load initial data
      await this.loadDashboardData();
      
      // Start main application loop
      await this.mainMenu();
      
    } catch (error) {
      console.error('❌ Failed to start wallet application:', error.message);
      
      if (error.code === 'AUTHENTICATION_FAILED') {
        console.error('\n💡 Please check your TropiPay credentials:');
        console.error('   - TROPIPAY_CLIENT_ID');
        console.error('   - TROPIPAY_CLIENT_SECRET');
      }
    } finally {
      this.cleanup();
    }
  }
  
  /**
   * Authenticate with TropiPay
   */
  async authenticate() {
    console.log('🔐 Authenticating with TropiPay...');
    
    try {
      const authResult = await this.sdk.authenticate();
      
      console.log('✅ Authentication successful!');
      console.log(`👤 User: ${authResult.profile.firstName} ${authResult.profile.lastName}`);
      console.log(`📧 Email: ${authResult.profile.email}`);
      console.log(`🔐 KYC Level: ${authResult.profile.kycLevel}/3`);
      console.log(`📱 2FA: ${authResult.profile.twoFaType === 1 ? 'SMS' : 'Google Authenticator'}`);
      
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  
  /**
   * Load dashboard data (accounts, beneficiaries, etc.)
   */
  async loadDashboardData() {
    console.log('\n📊 Loading your wallet data...');
    
    try {
      // Load accounts and beneficiaries in parallel
      const [accounts, beneficiaries] = await Promise.all([
        this.sdk.accounts.getAll(),
        this.sdk.beneficiaries.getAll({ limit: 50 })
      ]);
      
      this.accounts = accounts;
      this.beneficiaries = beneficiaries;
      
      console.log(`✅ Loaded ${accounts.length} accounts and ${beneficiaries.length} beneficiaries`);
      
    } catch (error) {
      console.error('⚠️  Warning: Could not load all wallet data:', error.message);
      // Continue with empty data - the app can still function
      this.accounts = [];
      this.beneficiaries = [];
    }
  }
  
  /**
   * Main application menu
   */
  async mainMenu() {
    while (this.isRunning) {
      try {
        console.log('\n🏦 =================== MAIN MENU ===================');
        console.log('1️⃣   View Account Summary');
        console.log('2️⃣   View Transaction History');
        console.log('3️⃣   Send Money');
        console.log('4️⃣   Manage Beneficiaries');
        console.log('5️⃣   Account Statistics');
        console.log('6️⃣   Transfer History');
        console.log('7️⃣   Profile Settings');
        console.log('8️⃣   Refresh Data');
        console.log('9️⃣   Help & Information');
        console.log('0️⃣   Logout & Exit');
        console.log('==================================================');
        
        const choice = await this.promptUser('Select an option (0-9): ');
        
        switch (choice.trim()) {
          case '1':
            await this.showAccountSummary();
            break;
          case '2':
            await this.showTransactionHistory();
            break;
          case '3':
            await this.sendMoneyFlow();
            break;
          case '4':
            await this.manageBeneficiaries();
            break;
          case '5':
            await this.showAccountStatistics();
            break;
          case '6':
            await this.showTransferHistory();
            break;
          case '7':
            await this.profileSettings();
            break;
          case '8':
            await this.refreshData();
            break;
          case '9':
            this.showHelp();
            break;
          case '0':
            await this.logout();
            break;
          default:
            console.log('❌ Invalid option. Please select 0-9.');
        }
        
      } catch (error) {
        console.error('❌ Menu error:', error.message);
        await this.promptUser('Press Enter to continue...');
      }
    }
  }
  
  /**
   * Show account summary
   */
  async showAccountSummary() {
    console.log('\n💰 ================ ACCOUNT SUMMARY ================');
    
    if (this.accounts.length === 0) {
      console.log('⚠️  No accounts found.');
      return;
    }
    
    let totalUSD = 0;
    
    this.accounts.forEach((account, index) => {
      console.log(`\n${index + 1}. ${account.currency} Account (${account.accountId})`);
      console.log(`   💵 Balance: $${account.balance.toFixed(2)}`);
      console.log(`   ✅ Available: $${account.available.toFixed(2)}`);
      console.log(`   🔒 Blocked: $${account.blocked.toFixed(2)}`);
      console.log(`   📈 Pending In: $${account.pendingIn.toFixed(2)}`);
      console.log(`   📉 Pending Out: $${account.pendingOut.toFixed(2)}`);
      console.log(`   📋 Status: ${account.status}`);
      console.log(`   ⭐ Default: ${account.isDefault ? 'Yes' : 'No'}`);
      
      // Add to total (simplified - convert all to USD for total)
      if (account.currency === 'USD') {
        totalUSD += account.balance;
      }
    });
    
    console.log(`\n📊 Total Balance (USD): $${totalUSD.toFixed(2)}`);
    console.log('==================================================');
    
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Show transaction history for selected account
   */
  async showTransactionHistory() {
    console.log('\n📜 ============== TRANSACTION HISTORY ==============');
    
    if (this.accounts.length === 0) {
      console.log('⚠️  No accounts available.');
      await this.promptUser('Press Enter to continue...');
      return;
    }
    
    // Select account
    const account = await this.selectAccount();
    if (!account) return;
    
    console.log(`\n📋 Loading transactions for ${account.currency} account...`);
    
    try {
      const movements = await this.sdk.accounts.getMovements(account.accountId, {
        limit: 20
      });
      
      if (movements.length === 0) {
        console.log('📭 No transactions found.');
      } else {
        console.log(`\n📊 Recent Transactions (${movements.length}):`);
        
        movements.forEach((movement, index) => {
          const sign = movement.type.includes('IN') ? '+' : '-';
          const icon = movement.type.includes('IN') ? '📥' : '📤';
          
          console.log(`\n${index + 1}. ${icon} ${sign}$${movement.amount.toFixed(2)} - ${movement.type}`);
          console.log(`   📅 Date: ${movement.createdAt.toLocaleDateString()}`);
          console.log(`   📝 Description: ${movement.description}`);
          console.log(`   🏷️  Reference: ${movement.reference}`);
          console.log(`   📊 Status: ${movement.status}`);
          console.log(`   💰 Balance After: $${movement.balanceAfter.toFixed(2)}`);
          
          if (movement.counterpart?.name) {
            console.log(`   👤 ${movement.type.includes('IN') ? 'From' : 'To'}: ${movement.counterpart.name}`);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load transactions:', error.message);
    }
    
    console.log('\n==================================================');
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Complete send money workflow
   */
  async sendMoneyFlow() {
    console.log('\n💸 ================= SEND MONEY ===================');
    
    try {
      // Step 1: Select source account
      const sourceAccount = await this.selectAccount('Select source account:');
      if (!sourceAccount) return;
      
      // Step 2: Select beneficiary
      const beneficiary = await this.selectBeneficiary();
      if (!beneficiary) return;
      
      // Step 3: Get transfer amount
      const amount = await this.getTransferAmount(sourceAccount);
      if (!amount) return;
      
      // Step 4: Get transfer reason
      const reason = await this.promptUser('Transfer reason (optional): ') || 'Money transfer';
      
      // Step 5: Simulate transfer
      console.log('\n🧮 Calculating fees and exchange rates...');
      
      const simulation = await this.sdk.transfers.simulate({
        fromAccountId: sourceAccount.accountId,
        beneficiaryId: beneficiary.id,
        amount: amount,
        reason: reason
      });
      
      // Step 6: Show simulation results and confirm
      if (!(await this.showTransferConfirmation(simulation, beneficiary))) {
        console.log('❌ Transfer cancelled.');
        return;
      }
      
      // Step 7: Handle 2FA if required
      const transferData = {
        fromAccountId: sourceAccount.accountId,
        beneficiaryId: beneficiary.id,
        amount: amount,
        reason: reason
      };
      
      if (simulation.requires2FA) {
        const success = await this.handle2FA(transferData);
        if (!success) {
          console.log('❌ 2FA verification failed. Transfer cancelled.');
          return;
        }
      }
      
      // Step 8: Execute transfer
      console.log('\n⏳ Processing transfer...');
      
      const result = await this.sdk.transfers.execute(transferData);
      
      console.log('\n🎉 Transfer completed successfully!');
      console.log(`   Transfer ID: ${result.transferId}`);
      console.log(`   Reference: ${result.reference}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Amount Sent: $${result.amountSent.toFixed(2)}`);
      console.log(`   Recipient Gets: ${result.currency}${result.amountReceived.toFixed(2)}`);
      
      // Refresh account data
      await this.loadDashboardData();
      
    } catch (error) {
      console.error('❌ Transfer failed:', error.message);
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error('💡 You don\'t have enough funds for this transfer.');
      } else if (error.code === 'INVALID_2FA_CODE') {
        console.error('💡 The verification code was incorrect. Please try again.');
      }
    }
    
    console.log('\n==================================================');
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Handle 2FA verification
   */
  async handle2FA(transferData) {
    console.log('\n🔐 Two-Factor Authentication Required');
    
    const userProfile = this.sdk.getUserProfile();
    
    if (userProfile.twoFaType === 2) {
      console.log('📱 Please enter your Google Authenticator code:');
      const code = await this.promptUser('Google Authenticator Code: ');
      transferData.googleAuthCode = code.trim();
      return true;
    } else {
      console.log('📱 SMS verification required.');
      
      const phoneNumber = userProfile.phoneNumber || 
        await this.promptUser('Enter phone number for SMS: ');
      
      try {
        await this.sdk.transfers.requestSMSCode(phoneNumber);
        console.log('✅ SMS code sent successfully.');
        
        const smsCode = await this.promptUser('Enter SMS code: ');
        transferData.smsCode = smsCode.trim();
        
        return true;
      } catch (error) {
        console.error('❌ Failed to send SMS:', error.message);
        return false;
      }
    }
  }
  
  /**
   * Show transfer confirmation dialog
   */
  async showTransferConfirmation(simulation, beneficiary) {
    console.log('\n📋 ============= TRANSFER CONFIRMATION =============');
    console.log(`👤 Recipient: ${beneficiary.name}`);
    console.log(`🏦 Account: ${beneficiary.accountNumber}`);
    console.log(`🌍 Country: ${beneficiary.country}`);
    console.log('');
    console.log(`💵 Amount to Pay: $${simulation.amountToPay.toFixed(2)}`);
    console.log(`💰 Recipient Gets: ${simulation.toCurrency}${simulation.amountToReceive.toFixed(2)}`);
    console.log(`💳 Total Fees: $${simulation.fees.toFixed(2)}`);
    
    if (simulation.exchangeRate !== 1) {
      console.log(`🔄 Exchange Rate: 1 ${simulation.fromCurrency} = ${simulation.exchangeRate} ${simulation.toCurrency}`);
    }
    
    console.log(`⏱️  Estimated Arrival: ${simulation.estimatedArrival}`);
    console.log(`💰 Account Balance After: $${simulation.accountBalanceAfter.toFixed(2)}`);
    console.log('==================================================');
    
    const confirm = await this.promptUser('Confirm transfer? (yes/no): ');
    return confirm.toLowerCase().startsWith('y');
  }
  
  /**
   * Manage beneficiaries menu
   */
  async manageBeneficiaries() {
    console.log('\n👥 ============= MANAGE BENEFICIARIES ==============');
    console.log('1️⃣   View All Beneficiaries');
    console.log('2️⃣   Add New Beneficiary');
    console.log('3️⃣   Search Beneficiaries');
    console.log('4️⃣   Validate Account Number');
    console.log('5️⃣   Validate SWIFT Code');
    console.log('0️⃣   Back to Main Menu');
    console.log('==================================================');
    
    const choice = await this.promptUser('Select option: ');
    
    switch (choice.trim()) {
      case '1':
        await this.showAllBeneficiaries();
        break;
      case '2':
        await this.addNewBeneficiary();
        break;
      case '3':
        await this.searchBeneficiaries();
        break;
      case '4':
        await this.validateAccountNumber();
        break;
      case '5':
        await this.validateSwiftCode();
        break;
      case '0':
        return;
      default:
        console.log('❌ Invalid option.');
    }
    
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Show all beneficiaries
   */
  async showAllBeneficiaries() {
    console.log('\n📇 All Beneficiaries:');
    
    if (this.beneficiaries.length === 0) {
      console.log('📭 No beneficiaries found.');
      return;
    }
    
    this.beneficiaries.forEach((beneficiary, index) => {
      console.log(`\n${index + 1}. ${beneficiary.name} (${beneficiary.type})`);
      console.log(`   🏦 Account: ${beneficiary.accountNumber}`);
      console.log(`   💱 Currency: ${beneficiary.currency}`);
      console.log(`   🌍 Country: ${beneficiary.country}`);
      console.log(`   📧 Email: ${beneficiary.email || 'N/A'}`);
      console.log(`   📱 Phone: ${beneficiary.phoneNumber || 'N/A'}`);
      console.log(`   ✅ Verified: ${beneficiary.isVerified ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${beneficiary.createdAt.toLocaleDateString()}`);
      
      if (beneficiary.type === 'EXTERNAL' && beneficiary.bankDetails?.swiftCode) {
        console.log(`   🏛️  Bank: ${beneficiary.bankDetails.name || 'Unknown'}`);
        console.log(`   🔀 SWIFT: ${beneficiary.bankDetails.swiftCode}`);
      }
    });
  }
  
  /**
   * Add new beneficiary workflow
   */
  async addNewBeneficiary() {
    console.log('\n➕ Add New Beneficiary:');
    
    try {
      // Basic information
      const firstName = await this.promptUser('First Name: ');
      const lastName = await this.promptUser('Last Name: ');
      const country = (await this.promptUser('Country Code (e.g., US, ES, CU): ')).toUpperCase();
      const currency = (await this.promptUser('Currency (USD, EUR, CUP): ')).toUpperCase();
      
      // Type selection
      console.log('\n1. Internal (TropiPay account)');
      console.log('2. External (Bank account)');
      const typeChoice = await this.promptUser('Select type (1-2): ');
      
      const type = typeChoice === '1' ? 'INTERNAL' : 'EXTERNAL';
      
      const beneficiaryData = {
        type,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country: country.trim(),
        currency: currency.trim()
      };
      
      if (type === 'INTERNAL') {
        // Internal account (email)
        beneficiaryData.email = await this.promptUser('Email/Account: ');
        beneficiaryData.accountNumber = beneficiaryData.email;
      } else {
        // External account
        beneficiaryData.accountNumber = await this.promptUser('Account Number/IBAN: ');
        beneficiaryData.phoneNumber = await this.promptUser('Phone Number (optional): ') || undefined;
        
        // Bank details
        const bankName = await this.promptUser('Bank Name: ');
        const swiftCode = await this.promptUser('SWIFT/BIC Code (optional): ') || undefined;
        
        if (bankName || swiftCode) {
          beneficiaryData.bankDetails = {
            name: bankName.trim() || undefined,
            swiftCode: swiftCode?.trim().toUpperCase() || undefined
          };
        }
      }
      
      // Optional fields
      beneficiaryData.relationship = await this.promptUser('Relationship (optional): ') || undefined;
      beneficiaryData.purpose = await this.promptUser('Transfer purpose (optional): ') || undefined;
      
      console.log('\n⏳ Creating beneficiary...');
      
      const newBeneficiary = await this.sdk.beneficiaries.create(beneficiaryData);
      
      console.log('✅ Beneficiary created successfully!');
      console.log(`   ID: ${newBeneficiary.id}`);
      console.log(`   Name: ${newBeneficiary.name}`);
      
      // Refresh beneficiaries list
      this.beneficiaries = await this.sdk.beneficiaries.getAll({ limit: 50 });
      
    } catch (error) {
      console.error('❌ Failed to create beneficiary:', error.message);
      
      if (error.validationErrors) {
        console.error('Validation errors:');
        Object.entries(error.validationErrors).forEach(([field, errors]) => {
          console.error(`  ${field}: ${errors.join(', ')}`);
        });
      }
    }
  }
  
  /**
   * Search beneficiaries
   */
  async searchBeneficiaries() {
    const query = await this.promptUser('Enter search term (name, email, account): ');
    
    if (!query.trim()) {
      console.log('❌ Please enter a search term.');
      return;
    }
    
    try {
      const results = await this.sdk.beneficiaries.search(query.trim());
      
      console.log(`\n🔍 Search Results (${results.length} found):`);
      
      if (results.length === 0) {
        console.log('📭 No beneficiaries found matching your search.');
      } else {
        results.forEach((beneficiary, index) => {
          console.log(`\n${index + 1}. ${beneficiary.name}`);
          console.log(`   🏦 ${beneficiary.accountNumber}`);
          console.log(`   💱 ${beneficiary.currency} - ${beneficiary.country}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Search failed:', error.message);
    }
  }
  
  /**
   * Validate account number
   */
  async validateAccountNumber() {
    const accountNumber = await this.promptUser('Account Number/IBAN to validate: ');
    const country = (await this.promptUser('Country Code: ')).toUpperCase();
    
    if (!accountNumber.trim() || !country.trim()) {
      console.log('❌ Both account number and country are required.');
      return;
    }
    
    try {
      console.log('⏳ Validating account number...');
      
      const validation = await this.sdk.beneficiaries.validateAccountNumber({
        accountNumber: accountNumber.trim(),
        country: country.trim()
      });
      
      if (validation.valid) {
        console.log('✅ Account number is valid!');
        
        if (validation.bankInfo) {
          console.log('🏦 Bank Information:');
          console.log(`   Name: ${validation.bankInfo.name || 'Unknown'}`);
          console.log(`   Branch: ${validation.bankInfo.branch || 'N/A'}`);
          console.log(`   Country: ${validation.bankInfo.country || country}`);
        }
      } else {
        console.log('❌ Account number is invalid.');
        console.log(`   Reason: ${validation.message}`);
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }
  
  /**
   * Validate SWIFT code
   */
  async validateSwiftCode() {
    const swiftCode = (await this.promptUser('SWIFT/BIC Code to validate: ')).toUpperCase();
    
    if (!swiftCode.trim()) {
      console.log('❌ SWIFT code is required.');
      return;
    }
    
    try {
      console.log('⏳ Validating SWIFT code...');
      
      const validation = await this.sdk.beneficiaries.validateSwiftCode({
        swiftCode: swiftCode.trim()
      });
      
      if (validation.valid) {
        console.log('✅ SWIFT code is valid!');
        
        if (validation.bankInfo) {
          console.log('🏦 Bank Information:');
          console.log(`   Name: ${validation.bankInfo.name || 'Unknown'}`);
          console.log(`   Country: ${validation.bankInfo.country || 'Unknown'}`);
          console.log(`   Address: ${validation.bankInfo.address || 'N/A'}`);
        }
      } else {
        console.log('❌ SWIFT code is invalid.');
        console.log(`   Reason: ${validation.message}`);
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }
  
  /**
   * Show account statistics
   */
  async showAccountStatistics() {
    console.log('\n📊 ============= ACCOUNT STATISTICS ===============');
    
    const account = await this.selectAccount('Select account for statistics:');
    if (!account) return;
    
    try {
      const stats = await this.sdk.accounts.getStatistics(account.accountId, {
        days: 30
      });
      
      console.log(`\n📈 30-Day Statistics for ${account.currency} Account:`);
      console.log(`   🔢 Total Transactions: ${stats.transactionCount}`);
      console.log(`   📤 Total Sent: $${stats.totalSent.toFixed(2)}`);
      console.log(`   📥 Total Received: $${stats.totalReceived.toFixed(2)}`);
      console.log(`   💳 Total Fees: $${stats.totalFees.toFixed(2)}`);
      console.log(`   📊 Average Transaction: $${stats.avgTransactionAmount.toFixed(2)}`);
      
      const netFlow = stats.totalReceived - stats.totalSent;
      console.log(`   📈 Net Flow: ${netFlow >= 0 ? '+' : ''}$${netFlow.toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Failed to load statistics:', error.message);
    }
    
    console.log('\n==================================================');
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Show transfer history
   */
  async showTransferHistory() {
    console.log('\n📋 ============== TRANSFER HISTORY ================');
    
    try {
      const transfers = await this.sdk.transfers.getHistory({
        limit: 10
      });
      
      if (transfers.length === 0) {
        console.log('📭 No transfers found.');
      } else {
        console.log(`\n📊 Recent Transfers (${transfers.length}):`);
        
        transfers.forEach((transfer, index) => {
          console.log(`\n${index + 1}. ${transfer.reference} - ${transfer.status}`);
          console.log(`   💵 Amount Sent: $${transfer.amountSent.toFixed(2)}`);
          console.log(`   💰 Amount Received: ${transfer.currency}${transfer.amountReceived.toFixed(2)}`);
          console.log(`   💳 Fees: $${transfer.fees.toFixed(2)}`);
          console.log(`   📅 Date: ${transfer.createdAt.toLocaleDateString()}`);
          console.log(`   👤 Recipient: ${transfer.recipient.name || 'Unknown'}`);
          console.log(`   📝 Description: ${transfer.description}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load transfer history:', error.message);
    }
    
    console.log('\n==================================================');
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Profile settings
   */
  async profileSettings() {
    console.log('\n👤 ============== PROFILE SETTINGS ================');
    
    const profile = this.sdk.getUserProfile();
    
    if (!profile) {
      console.log('❌ No user profile available.');
      return;
    }
    
    console.log(`📧 Email: ${profile.email}`);
    console.log(`👤 Name: ${profile.firstName || 'N/A'} ${profile.lastName || 'N/A'}`);
    console.log(`📱 Phone: ${profile.phoneNumber || 'N/A'}`);
    console.log(`🔐 KYC Level: ${profile.kycLevel}/3`);
    console.log(`📱 2FA Type: ${profile.twoFaType === 1 ? 'SMS' : 'Google Authenticator'}`);
    console.log(`📅 Member Since: ${profile.createdAt?.toLocaleDateString() || 'N/A'}`);
    console.log(`🔑 Last Login: ${profile.lastLoginAt?.toLocaleDateString() || 'N/A'}`);
    console.log(`📊 Status: ${profile.status}`);
    
    console.log('\n🔧 SDK Configuration:');
    const config = this.sdk.getConfig();
    console.log(`   🌍 Environment: ${config.environment}`);
    console.log(`   ⏱️  Timeout: ${config.timeout}ms`);
    console.log(`   🐛 Debug: ${config.debug ? 'Enabled' : 'Disabled'}`);
    
    console.log('\n🔐 Session Information:');
    console.log(`   ✅ Authenticated: ${this.sdk.isAuthenticated()}`);
    console.log(`   🎫 Token Expires: ${this.sdk.getTokenExpiry()?.toLocaleString() || 'N/A'}`);
    
    console.log('\n==================================================');
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Refresh all data
   */
  async refreshData() {
    console.log('\n🔄 Refreshing wallet data...');
    
    try {
      await this.loadDashboardData();
      console.log('✅ Data refreshed successfully!');
    } catch (error) {
      console.error('❌ Failed to refresh data:', error.message);
    }
    
    await this.promptUser('Press Enter to continue...');
  }
  
  /**
   * Show help information
   */
  showHelp() {
    console.log('\n❓ =================== HELP ====================');
    console.log('🏦 TropiPay Wallet Demo Application');
    console.log('');
    console.log('This application demonstrates how to use the TropiPay SDK');
    console.log('to build a complete wallet application with features like:');
    console.log('');
    console.log('💰 Account Management:');
    console.log('   - View account balances and information');
    console.log('   - Check transaction history');
    console.log('   - View account statistics');
    console.log('');
    console.log('💸 Money Transfers:');
    console.log('   - Send money to beneficiaries');
    console.log('   - Simulate transfers to see fees');
    console.log('   - 2FA verification (SMS/Google Auth)');
    console.log('   - View transfer history');
    console.log('');
    console.log('👥 Beneficiary Management:');
    console.log('   - Add internal (TropiPay) beneficiaries');
    console.log('   - Add external (bank) beneficiaries');
    console.log('   - Validate account numbers and SWIFT codes');
    console.log('   - Search and manage beneficiaries');
    console.log('');
    console.log('🔐 Security:');
    console.log('   - OAuth2 authentication');
    console.log('   - Two-factor authentication');
    console.log('   - Secure token management');
    console.log('');
    console.log('📚 Resources:');
    console.log('   - SDK Documentation: https://developer.tropipay.com');
    console.log('   - API Reference: https://developer.tropipay.com/api');
    console.log('   - Support: developers@tropipay.com');
    console.log('');
    console.log('==================================================');
  }
  
  /**
   * Logout and exit
   */
  async logout() {
    console.log('\n👋 Logging out...');
    
    try {
      await this.sdk.auth.logout();
      console.log('✅ Logged out successfully.');
    } catch (error) {
      console.log('⚠️  Logout warning:', error.message);
    }
    
    this.user = null;
    this.isRunning = false;
    
    console.log('👋 Thank you for using TropiPay Wallet Demo!');
    console.log('💡 Visit https://developer.tropipay.com for more information.');
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  /**
   * Select an account from available accounts
   */
  async selectAccount(prompt = 'Select account:') {
    if (this.accounts.length === 0) {
      console.log('❌ No accounts available.');
      return null;
    }
    
    if (this.accounts.length === 1) {
      return this.accounts[0];
    }
    
    console.log(`\\n${prompt}`);
    this.accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.currency} Account - $${account.balance.toFixed(2)} (${account.accountId})`);
    });
    
    const choice = await this.promptUser(`Select account (1-${this.accounts.length}): `);
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < this.accounts.length) {
      return this.accounts[index];
    }
    
    console.log('❌ Invalid account selection.');
    return null;
  }
  
  /**
   * Select a beneficiary from available beneficiaries
   */
  async selectBeneficiary() {
    if (this.beneficiaries.length === 0) {
      console.log('❌ No beneficiaries available. Please add a beneficiary first.');
      return null;
    }
    
    console.log('\\nSelect beneficiary:');
    this.beneficiaries.forEach((beneficiary, index) => {
      console.log(`${index + 1}. ${beneficiary.name} - ${beneficiary.accountNumber} (${beneficiary.currency})`);
    });
    
    const choice = await this.promptUser(`Select beneficiary (1-${this.beneficiaries.length}): `);
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < this.beneficiaries.length) {
      return this.beneficiaries[index];
    }
    
    console.log('❌ Invalid beneficiary selection.');
    return null;
  }
  
  /**
   * Get transfer amount with validation
   */
  async getTransferAmount(account) {
    while (true) {
      const input = await this.promptUser(`Transfer amount (Available: $${account.available.toFixed(2)}): $`);
      const amount = parseFloat(input);
      
      if (isNaN(amount) || amount <= 0) {
        console.log('❌ Please enter a valid positive amount.');
        continue;
      }
      
      if (amount > account.available) {
        console.log(`❌ Insufficient funds. Available: $${account.available.toFixed(2)}`);
        continue;
      }
      
      return amount;
    }
  }
  
  /**
   * Show notification message
   */
  showNotification(message) {
    console.log(`\\n📢 ${message}`);
  }
  
  /**
   * Prompt user for input
   */
  promptUser(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.rl.close();
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  const walletApp = new TropiPayWalletApp();
  
  try {
    await walletApp.start();
  } catch (error) {
    console.error('💥 Application error:', error.message);
    process.exit(1);
  }
}

// Run the application if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = TropiPayWalletApp;