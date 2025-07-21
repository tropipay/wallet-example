/**
 * TropiPay Wallet Backend Server - Refactorizado con servicios
 * Servidor principal que coordina entre los servicios
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const userService = require('./services/userService');
const tropiPayService = require('./services/tropiPayService');

const app = express();

// Configuración de CORS
app.use(cors(config.getCorsConfig()));

app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========== ENDPOINTS DE AUTENTICACIÓN ==========

// Obtener entornos disponibles
app.get('/auth/environments', (req, res) => {
  res.json({
    environments: [
      {
        key: 'development',
        name: 'Desarrollo (Sandbox)',
        url: config.getTropiPayUrl('development'),
        description: 'Entorno de pruebas con datos simulados'
      },
      {
        key: 'production',
        name: 'Producción',
        url: config.getTropiPayUrl('production'),
        description: 'Entorno real con transacciones reales'
      }
    ],
    current: tropiPayService.getCurrentEnvironment(),
    default: config.defaultTropiPayEnv
  });
});

// Registro de nuevo usuario
app.post('/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, clientId, clientSecret, environment } = req.body;
    
    // Validaciones básicas
    if (!firstName || !lastName || !email || !clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'firstName, lastName, email, clientId y clientSecret son requeridos' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido' 
      });
    }

    // Validar entorno si se proporciona
    if (environment && !config.isValidEnvironment(environment)) {
      return res.status(400).json({
        error: 'Entorno no válido. Debe ser "development" o "production"'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await database.getUser(clientId);
    if (existingUser) {
      return res.status(409).json({
        error: 'Ya existe un usuario con ese Client ID'
      });
    }

    // Cambiar entorno si es necesario
    if (environment) {
      tropiPayService.switchEnvironment(environment);
    }

    // Validar credenciales con TropiPay
    try {
      const tokenData = await tropiPayService.getAccessToken(clientId, clientSecret);
      // Si llegamos aquí, las credenciales son válidas
    } catch (error) {
      return res.status(401).json({ 
        error: 'Credenciales de TropiPay inválidas',
        details: error.response?.data?.message || error.message
      });
    }

    // Crear usuario en base de datos local
    const userId = await database.createUser(clientId, clientSecret, {
      firstName,
      lastName,
      email,
      phone
    });

    console.log(`✅ Usuario registrado: ${firstName} ${lastName} (${email}) - ID: ${userId}`);

    res.json({ 
      success: true,
      message: 'Usuario registrado correctamente',
      data: {
        userId,
        environment: tropiPayService.getCurrentEnvironment(),
        apiUrl: config.getTropiPayUrl(tropiPayService.getCurrentEnvironment())
      }
    });

  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Login con credenciales
app.post('/auth/login', async (req, res) => {
  try {
    const { client_id, client_secret, environment } = req.body;
    
    if (!client_id || !client_secret) {
      return res.status(400).json({ 
        error: 'client_id y client_secret son requeridos' 
      });
    }

    // Validar entorno si se proporciona
    if (environment && !config.isValidEnvironment(environment)) {
      return res.status(400).json({
        error: 'Entorno no válido. Debe ser "development" o "production"'
      });
    }

    const result = await userService.authenticateUser(client_id, client_secret, environment);
    
    // Agregar información del entorno usado
    result.environment = tropiPayService.getCurrentEnvironment();
    result.apiUrl = config.getTropiPayUrl(result.environment);
    
    res.json(result);

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
    const accounts = await userService.refreshUserAccounts(userId);
    res.json(accounts);

  } catch (error) {
    console.error('Accounts error:', error.message);
    
    if (error.message.includes('Token expirado')) {
      return res.status(401).json({ error: error.message });
    }
    
    if (error.message.includes('no autenticado')) {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error obteniendo cuentas' });
  }
});

// ========== ENDPOINTS DE BENEFICIARIOS ==========

// ========== ENDPOINTS ESPECÍFICOS PRIMERO ==========

// Crear nuevo beneficiario con API correcta
app.post('/beneficiaries/create/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const beneficiaryData = req.body;
    
    const result = await userService.createUserBeneficiaryNew(userId, beneficiaryData);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Create beneficiary error:', error.message);
    res.status(500).json({ 
      error: 'Error creando beneficiario',
      details: error.response?.data?.message || error.message
    });
  }
});

// Validar número de cuenta
app.post('/beneficiaries/validate-account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const validationData = req.body;
    
    const result = await userService.validateAccountNumber(userId, validationData);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Account validation error:', error.message);
    res.status(500).json({ 
      error: 'Error validando cuenta',
      details: error.response?.data?.message || error.message
    });
  }
});

// Validar código SWIFT
app.post('/beneficiaries/validate-swift/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const validationData = req.body;
    
    const result = await userService.validateSwiftCode(userId, validationData);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('SWIFT validation error:', error.message);
    res.status(500).json({ 
      error: 'Error validando SWIFT',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINTS GENÉRICOS DESPUÉS ==========

// Obtener beneficiarios del usuario
app.get('/beneficiaries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { offset = 0, limit = 20 } = req.query;
    
    const beneficiaries = await userService.refreshUserBeneficiaries(
      userId, 
      parseInt(offset), 
      parseInt(limit)
    );
    
    res.json(beneficiaries);

  } catch (error) {
    console.error('Beneficiaries error:', error.message);
    res.status(500).json({ error: 'Error obteniendo beneficiarios' });
  }
});

// Agregar nuevo beneficiario (método antiguo)
app.post('/beneficiaries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const beneficiaryData = req.body;
    
    const result = await userService.createUserBeneficiary(userId, beneficiaryData);
    res.json(result);

  } catch (error) {
    console.error('Add beneficiary error:', error.message);
    res.status(500).json({ 
      error: 'Error agregando beneficiario',
      details: error.response?.data?.message || error.message
    });
  }
});

// ========== ENDPOINTS DE MOVIMIENTOS ==========

// Obtener movimientos de una cuenta
app.get('/movements/:userId/:accountId', async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    const { offset = 0, limit = 20 } = req.query;
    
    const movements = await userService.getUserAccountMovements(
      userId, 
      accountId, 
      parseInt(offset), 
      parseInt(limit)
    );
    
    res.json(movements);

  } catch (error) {
    console.error('Movements error:', error.message);
    res.status(500).json({ 
      error: 'Error obteniendo movimientos',
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
    
    const result = await userService.requestTransferSMS(userId, phoneNumber);
    
    res.json({
      success: true,
      message: result.message,
      skipSMS: result.skipSMS,
      isDemoMode: result.isDemoMode,
      demoCode: result.demoCode,
      data: result.data
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
    
    const simulationResult = await userService.simulateUserTransfer(userId, transferData);
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
    
    const transferResult = await userService.executeUserTransfer(userId, transferData);
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
    version: '2.0.0 - Refactored with Services',
    environment: config.getEnvironmentInfo(),
    tropiPayEnvironment: tropiPayService.getCurrentEnvironment(),
    tropiPayUrl: config.getTropiPayUrl(tropiPayService.getCurrentEnvironment())
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(config.port, () => {
  // Imprimir información de configuración
  config.printStartupInfo();
  
  console.log(`🚀 TropiPay Wallet Backend (Refactored) running on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`🌍 Environments: http://localhost:${config.port}/auth/environments`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔧 Architecture: Microservices with TropiPay Service isolation`);
  console.log(`🎯 TropiPay Activo: ${tropiPayService.getCurrentEnvironment().toUpperCase()}`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

module.exports = app;