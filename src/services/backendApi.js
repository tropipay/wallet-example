// Cliente para conectar con nuestro backend local
import axios from 'axios';

class BackendAPI {
  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // ========== AUTENTICACIÓN ==========

  async login(clientId, clientSecret, environment = null) {
    try {
      const response = await this.client.post('/auth/login', {
        client_id: clientId,
        client_secret: clientSecret,
        environment: environment
      });
      
      return {
        success: true,
        data: response.data.user,
        environment: response.data.environment,
        apiUrl: response.data.apiUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error de conexión',
        details: error.response?.data?.details
      };
    }
  }

  async getEnvironments() {
    try {
      const response = await this.client.get('/auth/environments');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo entornos',
        details: error.response?.data?.details
      };
    }
  }

  async registerUser(userData) {
    try {
      const response = await this.client.post('/auth/register', userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error registrando usuario',
        details: error.response?.data?.details
      };
    }
  }

  // ========== CUENTAS ==========

  async getAccounts(userId) {
    try {
      const response = await this.client.get(`/accounts/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo cuentas'
      };
    }
  }

  // ========== MOVIMIENTOS ==========

  async getMovements(userId, accountId, offset = 0, limit = 20) {
    try {
      const response = await this.client.get(`/movements/${userId}/${accountId}`, {
        params: { offset, limit }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo movimientos'
      };
    }
  }

  // ========== BENEFICIARIOS ==========

  async getBeneficiaries(userId) {
    try {
      const response = await this.client.get(`/beneficiaries/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error obteniendo beneficiarios'
      };
    }
  }

  async addBeneficiary(userId, beneficiaryData) {
    try {
      const response = await this.client.post(`/beneficiaries/${userId}`, beneficiaryData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error agregando beneficiario',
        details: error.response?.data?.details
      };
    }
  }

  async createBeneficiary(userId, beneficiaryData) {
    try {
      const response = await this.client.post(`/beneficiaries/create/${userId}`, beneficiaryData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error creando beneficiario',
        details: error.response?.data?.details
      };
    }
  }

  async validateAccountNumber(userId, validationData) {
    try {
      const response = await this.client.post(`/beneficiaries/validate-account/${userId}`, validationData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error validando número de cuenta',
        details: error.response?.data?.details
      };
    }
  }

  async validateSwiftCode(userId, validationData) {
    try {
      const response = await this.client.post(`/beneficiaries/validate-swift/${userId}`, validationData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error validando código SWIFT',
        details: error.response?.data?.details
      };
    }
  }

  // ========== TRANSFERENCIAS ==========

  async simulateTransfer(userId, transferData) {
    try {
      const response = await this.client.post(`/transfer/simulate/${userId}`, transferData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error simulando transferencia',
        details: error.response?.data?.details
      };
    }
  }

  async executeTransfer(userId, transferData) {
    try {
      const response = await this.client.post(`/transfer/execute/${userId}`, transferData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error ejecutando transferencia',
        details: error.response?.data?.details
      };
    }
  }

  async requestTransferSMS(userId, phoneNumber) {
    try {
      const response = await this.client.post(`/transfer/request-sms/${userId}`, {
        phoneNumber: phoneNumber
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error solicitando código SMS',
        details: error.response?.data?.details
      };
    }
  }

  // ========== UTILIDADES ==========

  formatAmount(amount, currency = 'USD') {
    try {
      // Lista de monedas ISO 4217 soportadas
      const supportedCurrencies = [
        'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 
        'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN',
        'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU'
      ];
      
      if (supportedCurrencies.includes(currency)) {
        const formatter = new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return formatter.format(amount);
      } else {
        // Para criptomonedas y otras monedas no estándar
        const decimals = this.getCryptoCurrencyDecimals(currency);
        const formatter = new Intl.NumberFormat('es-ES', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
        return `${formatter.format(amount)} ${currency}`;
      }
    } catch (error) {
      // Fallback en caso de error
      console.error('Error formatting amount:', error);
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  
  // Helper function para obtener decimales según el tipo de cripto
  getCryptoCurrencyDecimals(currency) {
    const cryptoDecimals = {
      'USDC': 2,
      'USDT': 2, 
      'BTC': 8,
      'ETH': 6,
      'BNB': 4,
      'ADA': 6,
      'DOT': 4,
      'MATIC': 4
    };
    
    return cryptoDecimals[currency] || 2;
  }

  formatDate(dateString) {
    if (!dateString) return 'No disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // ========== SALUD DEL SERVIDOR ==========

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Backend no disponible'
      };
    }
  }
}

// Singleton instance
const backendAPI = new BackendAPI();

export default backendAPI;