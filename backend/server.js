const express = require('express');
const cors = require('cors');
const axios = require('axios');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS para permitir conexiones desde React
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Cliente HTTP para TropiPay API
const tropiPayClient = axios.create({
  baseURL: 'https://www.tropipay.com/api/v3',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors para logging detallado de TropiPay API
tropiPayClient.interceptors.request.use((config) => {
  console.log('\n🚀 === TROPIPAY API REQUEST ===');
  console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  console.log('📋 Headers:', JSON.stringify(config.headers, null, 2));
  if (config.data) {
    console.log('📦 Payload:', JSON.stringify(config.data, null, 2));
  }
  if (config.params) {
    console.log('🔗 Params:', JSON.stringify(config.params, null, 2));
  }
  console.log('==============================\n');
  return config;
});

tropiPayClient.interceptors.response.use(
  (response) => {
    console.log('\n✅ === TROPIPAY API RESPONSE ===');
    console.log(`📥 ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));
    console.log('================================\n');
    return response;
  },
  (error) => {
    console.log('\n❌ === TROPIPAY API ERROR ===');
    console.log(`📥 ${error.response?.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    if (error.response?.headers) {
      console.log('📋 Error Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    if (error.response?.data) {
      console.log('📦 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('💥 Error Message:', error.message);
    }
    console.log('=============================\n');
    return Promise.reject(error);
  }
);

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper function para convertir cuentas de centavos a unidades principales
function convertAccountsFromCents(accounts) {
  return accounts.map(account => ({
    ...account,
    balance: (account.balance || 0) / 100,
    pendingIn: (account.pendingIn || 0) / 100,
    pendingOut: (account.pendingOut || 0) / 100,
    // Mantener available para compatibilidad
    available: (account.balance || 0) / 100
  }));
}

// Helper function para convertir movimientos de centavos a unidades principales
function convertMovementsFromCents(movementsData) {
  if (!movementsData || !movementsData.rows) {
    return movementsData;
  }
  
  return {
    ...movementsData,
    rows: movementsData.rows.map(movement => ({
      ...movement,
      amount: (movement.amount || 0) / 100,
      balanceAfter: (movement.balanceAfter || 0) / 100,
      balanceBefore: (movement.balanceBefore || 0) / 100,
      destinationAmount: movement.destinationAmount ? parseFloat(movement.destinationAmount) / 100 : 0,
      originalCurrencyAmount: movement.originalCurrencyAmount ? parseFloat(movement.originalCurrencyAmount) / 100 : 0
    }))
  };
}

// ========== ENDPOINTS DE AUTENTICACIÓN ==========

// Login con credenciales
app.post('/auth/login', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    
    if (!client_id || !client_secret) {
      return res.status(400).json({ 
        error: 'client_id y client_secret son requeridos' 
      });
    }

    // Obtener token de acceso de TropiPay
    const tokenResponse = await tropiPayClient.post('/access/token', {
      client_id,
      client_secret,
      grant_type: 'client_credentials'
    });

    const { access_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Buscar o crear usuario en BD local
    let user = await database.getUser(client_id);
    
    if (!user) {
      const userId = await database.createUser(client_id, client_secret);
      user = { id: userId, client_id, client_secret };
    }

    // Actualizar token en BD
    await database.updateUserToken(user.id, access_token, expiresAt);

    // Obtener información del usuario de TropiPay
    const userResponse = await tropiPayClient.get('/users/profile', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = userResponse.data;
    await database.updateUserData(user.id, profile);

    // Obtener cuentas
    const accountsResponse = await tropiPayClient.get('/accounts/', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let accounts = accountsResponse.data;
    console.log('🏦 Raw accounts response:', JSON.stringify(accounts, null, 2));
    
    // La respuesta de TropiPay es directamente un array de cuentas
    // No necesita extracción de data anidada
    
    // Asegurar que sea un array
    if (!Array.isArray(accounts)) {
      console.log('⚠️  Accounts is not an array, converting to empty array. Type:', typeof accounts);
      accounts = [];
    }
    
    console.log(`✅ Final accounts array (${accounts.length} items):`, JSON.stringify(accounts, null, 2));
    
    await database.saveAccounts(user.id, accounts);
    
    // Convertir cuentas para el frontend (dividir centavos)
    const convertedAccounts = convertAccountsFromCents(accounts);
    console.log(`💰 Converted accounts for frontend:`, JSON.stringify(convertedAccounts, null, 2));

    // Obtener beneficiarios
    try {
      const beneficiariesResponse = await tropiPayClient.get('/deposit_accounts/', {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { offset: 0, limit: 50 }
      });
      
      console.log('🏪 Raw beneficiaries login response:', JSON.stringify(beneficiariesResponse.data, null, 2));
      
      let beneficiaries = beneficiariesResponse.data?.rows || [];
      
      console.log(`✅ Beneficiaries login array (${beneficiaries.length} items):`, JSON.stringify(beneficiaries, null, 2));
      
      await database.saveBeneficiaries(user.id, beneficiaries);
    } catch (error) {
      console.log('Error loading beneficiaries:', error.message);
      // Guardar array vacío si hay error
      await database.saveBeneficiaries(user.id, []);
    }

    res.json({
      user: {
        id: user.id,
        client_id,
        profile,
        accounts: convertedAccounts,
        token: access_token,
        expires_at: expiresAt
      }
    });

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(401).json({ 
      error: 'Credenciales inválidas o error en la API',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINTS DE CUENTAS ==========

// Obtener cuentas del usuario
app.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar si el token ha expirado
    const now = new Date();
    const tokenExpiry = new Date(user.token_expires_at);
    if (tokenExpiry && now > tokenExpiry) {
      console.log(`⚠️  Token expired for user ${userId}. Expiry: ${tokenExpiry}, Now: ${now}`);
      return res.status(401).json({ error: 'Token expirado, necesita reautenticación' });
    }

    console.log(`🔄 Refreshing accounts for user ${userId}`);
    
    // Intentar obtener de la API primero
    try {
      const response = await tropiPayClient.get('/accounts/', {
        headers: { Authorization: `Bearer ${user.access_token}` }
      });
      
      let accounts = response.data;
      console.log('🏦 Raw accounts refresh response:', JSON.stringify(accounts, null, 2));
      
      // La respuesta de TropiPay es directamente un array de cuentas
      // No necesita extracción de data anidada
      
      // Asegurar que sea un array
      if (!Array.isArray(accounts)) {
        console.log('⚠️  Refresh accounts is not an array, converting to empty array. Type:', typeof accounts);
        accounts = [];
      }
      
      console.log(`✅ Final refresh accounts array (${accounts.length} items):`, JSON.stringify(accounts, null, 2));
      
      await database.saveAccounts(userId, accounts);
      
      // Convertir cuentas para el frontend (dividir centavos)
      const convertedAccounts = convertAccountsFromCents(accounts);
      console.log(`💰 Converted refresh accounts for frontend:`, JSON.stringify(convertedAccounts, null, 2));
      
      res.json(convertedAccounts);
    } catch (error) {
      console.log('⚠️  API failed, using local accounts from database');
      // Si falla la API, usar datos locales
      const localAccounts = await database.getAccounts(userId);
      console.log(`📦 Local accounts from DB (${localAccounts.length} items):`, JSON.stringify(localAccounts, null, 2));
      res.json(localAccounts);
    }

  } catch (error) {
    console.error('Accounts error:', error.message);
    res.status(500).json({ error: 'Error obteniendo cuentas' });
  }
});

// ========== ENDPOINTS DE MOVIMIENTOS ==========

// Obtener movimientos de una cuenta
app.get('/movements/:userId/:accountId', async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    const { offset = 0, limit = 20 } = req.query;
    
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const response = await tropiPayClient.get(`/accounts/${accountId}/movements`, {
      headers: { Authorization: `Bearer ${user.access_token}` },
      params: { offset, limit }
    });

    // Convertir movimientos de centavos a unidades principales
    const convertedMovements = convertMovementsFromCents(response.data);
    console.log(`💰 Converted movements for account ${accountId}:`, JSON.stringify(convertedMovements, null, 2));

    // Devolver solo el array de movimientos para que el frontend pueda usar .filter()
    res.json(convertedMovements?.rows || []);

  } catch (error) {
    console.error('Movements error:', error.message);
    res.status(500).json({ 
      error: 'Error obteniendo movimientos',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINTS DE BENEFICIARIOS ==========

// Obtener beneficiarios del usuario
app.get('/beneficiaries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { offset = 0, limit = 20 } = req.query;
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
      const response = await tropiPayClient.get('/deposit_accounts/', {
        headers: { Authorization: `Bearer ${user.access_token}` },
        params: { offset, limit }
      });
      
      console.log('🏪 Raw beneficiaries response:', JSON.stringify(response.data, null, 2));
      
      // La respuesta tiene estructura {count, rows}
      const beneficiariesData = response.data;
      const beneficiaries = beneficiariesData?.rows || [];
      
      console.log(`✅ Beneficiaries array (${beneficiaries.length} items):`, JSON.stringify(beneficiaries, null, 2));
      
      await database.saveBeneficiaries(userId, beneficiaries);
      
      // Devolver solo el array de beneficiarios
      res.json(beneficiaries);
    } catch (error) {
      console.log('⚠️  API failed, using local beneficiaries from database');
      const localBeneficiaries = await database.getBeneficiaries(userId);
      res.json(localBeneficiaries);
    }

  } catch (error) {
    console.error('Beneficiaries error:', error.message);
    res.status(500).json({ error: 'Error obteniendo beneficiarios' });
  }
});

// Agregar nuevo beneficiario
app.post('/beneficiaries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const beneficiaryData = req.body;
    
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const response = await tropiPayClient.post('/deposit_accounts', beneficiaryData, {
      headers: { Authorization: `Bearer ${user.access_token}` }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Add beneficiary error:', error.message);
    res.status(500).json({ 
      error: 'Error agregando beneficiario',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINTS DE TRANSFERENCIAS ==========

// Solicitar código SMS para 2FA
app.post('/transfer/request-sms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber } = req.body;
    
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
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
      return res.json({
        success: true,
        message: 'Usuario tiene Google Authenticator configurado',
        skipSMS: true
      });
    }

    console.log(`📱 Solicitando código SMS para transferencia - Usuario: ${userId}, Teléfono: ${phoneNumber}`);

    const response = await tropiPayClient.post('/users/sms/send', {
      phoneNumber: phoneNumber
    }, {
      headers: { 
        Authorization: `Bearer ${user.access_token}`,
        'X-DEVICE-ID': 'tropipay-wallet-app'
      }
    });

    console.log('📨 SMS request response:', JSON.stringify(response.data, null, 2));

    res.json({
      success: true,
      message: 'Código SMS enviado correctamente',
      data: response.data
    });

  } catch (error) {
    console.error('SMS request error:', error.message);
    res.status(500).json({ 
      error: 'Error al solicitar código SMS',
      details: error.response?.data?.message || error.message
    });
  }
});

// Simular transferencia
app.post('/transfer/simulate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const transferData = req.body;
    
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Convertir el monto a centavos para TropiPay API
    const transferDataInCents = {
      ...transferData,
      amountToPay: Math.round((transferData.amountToPay || 0) * 100)
    };

    console.log('📊 Transfer simulation data (converted to cents):', JSON.stringify(transferDataInCents, null, 2));

    const response = await tropiPayClient.post('/booking/payout/simulate', transferDataInCents, {
      headers: { 
        Authorization: `Bearer ${user.access_token}`,
        'X-DEVICE-ID': 'tropipay-wallet-app'
      }
    });

    // Convertir la respuesta de centavos a unidades principales
    const simulationResult = {
      ...response.data,
      amountToPay: (response.data.amountToPay || 0) / 100,
      amountToGet: (response.data.amountToGet || 0) / 100,
      amountToGetInEUR: (response.data.amountToGetInEUR || 0) / 100,
      fees: (response.data.fees || 0) / 100,
      accountLeftBalance: (response.data.accountLeftBalance || 0) / 100
    };

    console.log('💰 Transfer simulation result (converted from cents):', JSON.stringify(simulationResult, null, 2));

    res.json(simulationResult);

  } catch (error) {
    console.error('Transfer simulation error:', error.message);
    res.status(500).json({ 
      error: 'Error simulando transferencia',
      details: error.response?.data?.message || error.message
    });
  }
});

// Ejecutar transferencia
app.post('/transfer/execute/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const transferData = req.body;
    
    const user = await database.getUserById(userId);
    
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Convertir el monto a centavos para TropiPay API
    const transferDataInCents = {
      ...transferData,
      // Convertir amountToPay y amount a centavos
      amountToPay: Math.round((transferData.amountToPay || transferData.amount || 0) * 100),
      amount: Math.round((transferData.amount || transferData.amountToPay || 0) * 100),
      destinationAmount: transferData.destinationAmount ? Math.round(transferData.destinationAmount * 100) : undefined,
      // Asegurar que el código de seguridad se pase
      securityCode: transferData.securityCode
    };

    console.log('📊 Transfer execution data (converted to cents):', JSON.stringify(transferDataInCents, null, 2));

    const response = await tropiPayClient.post('/booking/payout', transferDataInCents, {
      headers: { 
        Authorization: `Bearer ${user.access_token}`,
        'X-DEVICE-ID': 'tropipay-wallet-app'
      }
    });

    // Convertir la respuesta de centavos a unidades principales si es necesario
    const transferResult = {
      ...response.data,
      amount: response.data.amount ? (response.data.amount / 100) : response.data.amount,
      destinationAmount: response.data.destinationAmount ? (response.data.destinationAmount / 100) : response.data.destinationAmount
    };

    console.log('💰 Transfer execution result:', JSON.stringify(transferResult, null, 2));

    res.json(transferResult);

  } catch (error) {
    console.error('Transfer execution error:', error.message);
    res.status(500).json({ 
      error: 'Error ejecutando transferencia',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINT DE SALUD ==========

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 TropiPay Wallet Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend URL: http://localhost:3000`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  database.close();
  process.exit(0);
});