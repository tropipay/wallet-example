/**
 * TropiPay SDK - Basic Usage Example
 * 
 * This example demonstrates basic SDK operations including authentication,
 * account management, and simple transfers. Perfect for getting started
 * with TropiPay integration.
 * 
 * To run this example:
 * 1. Set environment variables: TROPIPAY_CLIENT_ID, TROPIPAY_CLIENT_SECRET
 * 2. Run: node examples/basic-usage.js
 */

const TropiPaySDK = require('../src/index');

async function basicUsageExample() {
  try {
    // =========================================================================
    // 1. INITIALIZE SDK
    // =========================================================================
    
    console.log('🚀 Initializing TropiPay SDK...');
    
    const sdk = new TropiPaySDK({
      clientId: process.env.TROPIPAY_CLIENT_ID || 'your_client_id',
      clientSecret: process.env.TROPIPAY_CLIENT_SECRET || 'your_client_secret',
      environment: 'development', // 'development' uses https://sandbox.tropipay.me/api/v3
      debug: true // Enable detailed logging
    });
    
    // Listen to SDK events
    sdk.on('authenticated', (user) => {
      console.log('✅ User authenticated:', user.profile.email);
    });
    
    sdk.on('error', (error) => {
      console.error('❌ SDK Error:', error.message);
    });
    
    // =========================================================================
    // 2. AUTHENTICATE
    // =========================================================================
    
    console.log('\n📝 Authenticating with TropiPay...');
    
    const authResult = await sdk.authenticate();
    
    console.log('✅ Authentication successful!');
    console.log(`👤 User: ${authResult.profile.firstName} ${authResult.profile.lastName}`);
    console.log(`📧 Email: ${authResult.profile.email}`);
    console.log(`🔐 KYC Level: ${authResult.profile.kycLevel}`);
    console.log(`📱 2FA Type: ${authResult.profile.twoFaType === 1 ? 'SMS' : 'Google Authenticator'}`);
    console.log(`🏦 Available Accounts: ${authResult.accounts.length}`);
    console.log(`⏰ Token expires: ${authResult.expiresAt.toLocaleString()}`);
    
    // =========================================================================
    // 3. ACCOUNT MANAGEMENT
    // =========================================================================
    
    console.log('\n💰 Loading account information...');
    
    // Get all accounts
    const accounts = await sdk.accounts.getAll();
    
    console.log(`\n📊 Account Summary (${accounts.length} accounts):`);
    accounts.forEach(account => {
      console.log(`  ${account.currency} Account (${account.accountId}):`);
      console.log(`    💵 Balance: $${account.balance.toFixed(2)}`);
      console.log(`    ✅ Available: $${account.available.toFixed(2)}`);
      console.log(`    🔒 Blocked: $${account.blocked.toFixed(2)}`);
      console.log(`    📈 Pending In: $${account.pendingIn.toFixed(2)}`);
      console.log(`    📉 Pending Out: $${account.pendingOut.toFixed(2)}`);
      console.log(`    📋 Status: ${account.status}`);
      console.log(`    ⭐ Default: ${account.isDefault ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Get USD accounts specifically
    const usdAccounts = await sdk.accounts.getByCurrency('USD');
    console.log(`💵 USD Accounts: ${usdAccounts.length}`);
    
    // Get default account
    const defaultAccount = await sdk.accounts.getDefault('USD');
    if (defaultAccount) {
      console.log(`⭐ Default USD Account: ${defaultAccount.accountId} ($${defaultAccount.balance})`);
      
      // Check balance for potential transfer
      const balanceCheck = await sdk.accounts.checkBalance(defaultAccount.accountId, 10.00);
      console.log(`💸 Can transfer $10: ${balanceCheck.sufficient ? 'Yes' : 'No'}`);
      if (!balanceCheck.sufficient) {
        console.log(`   Need $${balanceCheck.shortfall.toFixed(2)} more`);
      }
    }
    
    // =========================================================================
    // 4. TRANSACTION HISTORY
    // =========================================================================
    
    console.log('\n📜 Loading recent transactions...');
    
    if (defaultAccount) {
      const movements = await sdk.accounts.getMovements(defaultAccount.accountId, {
        limit: 5 // Get last 5 transactions
      });
      
      console.log(`\n📋 Recent Transactions (${movements.length}):`);
      movements.forEach(movement => {
        const sign = movement.type.includes('IN') ? '+' : '-';
        console.log(`  ${movement.createdAt.toLocaleDateString()} - ${sign}$${movement.amount} (${movement.type})`);
        console.log(`    📝 ${movement.description}`);
        console.log(`    🏷️  ${movement.reference}`);
        console.log(`    📊 Status: ${movement.status}`);
        console.log(`    💰 Balance After: $${movement.balanceAfter}`);
        console.log('');
      });
      
      // Get account statistics
      const stats = await sdk.accounts.getStatistics(defaultAccount.accountId, {
        days: 30
      });
      
      console.log(`📊 30-Day Account Statistics:`);
      console.log(`  🔢 Transactions: ${stats.transactionCount}`);
      console.log(`  📤 Total Sent: $${stats.totalSent.toFixed(2)}`);
      console.log(`  📥 Total Received: $${stats.totalReceived.toFixed(2)}`);
      console.log(`  💳 Total Fees: $${stats.totalFees.toFixed(2)}`);
      console.log(`  📈 Avg Transaction: $${stats.avgTransactionAmount.toFixed(2)}`);
    }
    
    // =========================================================================
    // 5. BENEFICIARY MANAGEMENT
    // =========================================================================
    
    console.log('\n👥 Loading beneficiaries...');
    
    const beneficiaries = await sdk.beneficiaries.getAll({
      limit: 10
    });
    
    console.log(`\n📇 Beneficiaries (${beneficiaries.length}):`);
    beneficiaries.forEach(beneficiary => {
      console.log(`  👤 ${beneficiary.name} (${beneficiary.type})`);
      console.log(`    🏦 Account: ${beneficiary.accountNumber}`);
      console.log(`    💱 Currency: ${beneficiary.currency}`);
      console.log(`    🌍 Country: ${beneficiary.country}`);
      console.log(`    ✅ Verified: ${beneficiary.isVerified ? 'Yes' : 'No'}`);
      
      if (beneficiary.type === 'EXTERNAL' && beneficiary.bankDetails?.swiftCode) {
        console.log(`    🏛️  Bank: ${beneficiary.bankDetails.name}`);
        console.log(`    🔀 SWIFT: ${beneficiary.bankDetails.swiftCode}`);
      }
      console.log('');
    });
    
    // Search beneficiaries
    if (beneficiaries.length > 0) {
      const searchResults = await sdk.beneficiaries.search('John');
      console.log(`🔍 Search results for "John": ${searchResults.length} found`);
    }
    
    // =========================================================================
    // 6. DEMONSTRATION TRANSFER (SIMULATION ONLY)
    // =========================================================================
    
    console.log('\n💸 Demonstrating transfer simulation...');
    
    if (defaultAccount && beneficiaries.length > 0) {
      const firstBeneficiary = beneficiaries[0];
      
      try {
        console.log(`\n🎯 Simulating transfer to ${firstBeneficiary.name}...`);
        
        const simulation = await sdk.transfers.simulate({
          fromAccountId: defaultAccount.accountId,
          beneficiaryId: firstBeneficiary.id,
          amount: 5.00, // Small test amount
          reason: 'SDK Demo Transfer'
        });
        
        console.log('✅ Transfer Simulation Results:');
        console.log(`  💵 Amount to Pay: $${simulation.amountToPay.toFixed(2)}`);
        console.log(`  💰 Recipient Gets: ${simulation.toCurrency}${simulation.amountToReceive.toFixed(2)}`);
        console.log(`  💳 Total Fees: $${simulation.fees.toFixed(2)}`);
        console.log(`  🔄 Exchange Rate: ${simulation.exchangeRate}`);
        console.log(`  📱 2FA Required: ${simulation.requires2FA ? 'Yes' : 'No'}`);
        console.log(`  💰 Balance After: $${simulation.accountBalanceAfter.toFixed(2)}`);
        console.log(`  ⏱️  Estimated Arrival: ${simulation.estimatedArrival}`);
        
        if (simulation.breakdown) {
          console.log(`  📋 Fee Breakdown:`);
          console.log(`    💰 Base Fee: $${simulation.breakdown.baseFee.toFixed(2)}`);
          console.log(`    🔄 Exchange Fee: $${simulation.breakdown.exchangeFee.toFixed(2)}`);
          console.log(`    🌍 International Fee: $${simulation.breakdown.internationalFee.toFixed(2)}`);
        }
        
        // ⚠️ NOTE: We're NOT executing the transfer in this demo
        // To execute a real transfer, you would:
        //
        // if (simulation.requires2FA) {
        //   await sdk.transfers.requestSMSCode('+1234567890');
        //   const smsCode = '123456'; // Get from user input
        //   
        //   const result = await sdk.transfers.execute({
        //     fromAccountId: defaultAccount.accountId,
        //     beneficiaryId: firstBeneficiary.id,
        //     amount: 5.00,
        //     reason: 'SDK Demo Transfer',
        //     smsCode: smsCode
        //   });
        //   
        //   console.log('✅ Transfer executed:', result.transferId);
        // }
        
      } catch (error) {
        console.log('ℹ️  Transfer simulation failed (this is normal for demo):');
        console.log(`   Error: ${error.message}`);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
          console.log('   💡 This usually means the demo account has low balance');
        }
      }
    } else {
      console.log('ℹ️  No accounts or beneficiaries available for transfer simulation');
    }
    
    // =========================================================================
    // 7. TRANSFER HISTORY
    // =========================================================================
    
    console.log('\n📋 Loading transfer history...');
    
    try {
      const transferHistory = await sdk.transfers.getHistory({
        limit: 5
      });
      
      console.log(`\n📊 Recent Transfers (${transferHistory.length}):`);
      transferHistory.forEach(transfer => {
        console.log(`  🔄 ${transfer.reference} - ${transfer.status}`);
        console.log(`    💵 Amount: $${transfer.amountSent.toFixed(2)}`);
        console.log(`    📅 Date: ${transfer.createdAt.toLocaleDateString()}`);
        console.log(`    👤 To: ${transfer.recipient.name || 'Unknown'}`);
        console.log(`    📝 Description: ${transfer.description}`);
        console.log('');
      });
    } catch (error) {
      console.log('ℹ️  Transfer history not available (this is normal for new accounts)');
    }
    
    // =========================================================================
    // 8. SDK CONFIGURATION AND STATUS
    // =========================================================================
    
    console.log('\n⚙️  SDK Configuration:');
    const config = sdk.getConfig();
    console.log(`  🌍 Environment: ${config.environment}`);
    console.log(`  ⏱️  Timeout: ${config.timeout}ms`);
    console.log(`  🐛 Debug: ${config.debug ? 'Enabled' : 'Disabled'}`);
    console.log(`  🔄 Auto Refresh: ${config.retries ? 'Enabled' : 'Disabled'}`);
    
    console.log('\n🔐 Authentication Status:');
    console.log(`  ✅ Authenticated: ${sdk.isAuthenticated()}`);
    console.log(`  🎫 Token Valid Until: ${sdk.getTokenExpiry()?.toLocaleString()}`);
    
    const currentProfile = sdk.getUserProfile();
    if (currentProfile) {
      console.log(`  👤 Current User: ${currentProfile.email}`);
    }
    
    console.log('\n✅ Basic usage example completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  - Check out wallet-app.js for a complete wallet implementation');
    console.log('  - See transfers.js for advanced transfer workflows');
    console.log('  - Read the documentation at https://developer.tropipay.com');
    
  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
    
    if (error.code === 'AUTHENTICATION_FAILED') {
      console.error('\n💡 Make sure to set correct environment variables:');
      console.error('   TROPIPAY_CLIENT_ID=your_client_id');
      console.error('   TROPIPAY_CLIENT_SECRET=your_client_secret');
    }
    
    console.error('\n🐛 Full error details:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicUsageExample()
    .then(() => {
      console.log('\n👋 Example finished. Goodbye!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = basicUsageExample;