import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Wallet, Shield, Key, Globe } from 'lucide-react';
import backendAPI from '../services/backendApi';

const LoginPage = ({ onNavigateToRegister }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    environment: 'development'
  });
  const [showSecret, setShowSecret] = useState(false);
  const [environments, setEnvironments] = useState([]);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const { login, isLoading, error } = useAuth();

  // Cargar entornos disponibles al montar el componente
  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const result = await backendAPI.getEnvironments();
        if (result.success) {
          setEnvironments(result.data.environments);
          setFormData(prev => ({
            ...prev,
            environment: result.data.current || result.data.default || 'development'
          }));
        }
      } catch (error) {
        console.error('Error loading environments:', error);
      } finally {
        setLoadingEnvs(false);
      }
    };

    loadEnvironments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId || !formData.clientSecret) {
      return;
    }
    await login(formData.clientId, formData.clientSecret, formData.environment);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tropipay-50 to-tropipay-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-tropipay-500 p-4 rounded-full shadow-lg">
              <Wallet className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TropiPay Wallet
          </h1>
          <p className="text-gray-600">
            Inicia sesión con tus credenciales de aplicación
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client ID Field */}
            <div>
              <label htmlFor="clientId" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 mr-2" />
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                placeholder="your_client_id"
                required
                disabled={isLoading}
              />
            </div>

            {/* Client Secret Field */}
            <div>
              <label htmlFor="clientSecret" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 mr-2" />
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="clientSecret"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                  placeholder="your_client_secret"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Environment Selector */}
            <div>
              <label htmlFor="environment" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 mr-2" />
                Entorno
              </label>
              {loadingEnvs ? (
                <div className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                  <div className="loading-spinner mr-2"></div>
                  <span className="text-gray-500">Cargando entornos...</span>
                </div>
              ) : (
                <select
                  id="environment"
                  name="environment"
                  value={formData.environment}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                >
                  {environments.map((env) => (
                    <option key={env.key} value={env.key}>
                      {env.name}
                    </option>
                  ))}
                </select>
              )}
              {environments.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  {environments.find(env => env.key === formData.environment)?.description || 'Selecciona el entorno para conectarte'}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.clientId || !formData.clientSecret}
              className="w-full btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Navigation to Register */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm mb-2">
              ¿No tienes una cuenta?
            </p>
            <button
              onClick={onNavigateToRegister}
              className="text-tropipay-600 hover:text-tropipay-700 text-sm font-medium"
              disabled={isLoading}
            >
              Registrar nueva cuenta
            </button>
          </div>

          {/* Info Section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-medium mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Credenciales de Aplicación
              </h3>
              <p className="text-blue-700 text-sm">
                Utiliza las credenciales proporcionadas por TropiPay para tu aplicación. 
                Estas credenciales permiten acceder a la API usando OAuth2 Client Credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Credentials (solo para desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="card p-4 bg-yellow-50 border-yellow-200">
            <h4 className="text-yellow-800 font-medium mb-2">Credenciales de Prueba</h4>
            <p className="text-yellow-700 text-sm mb-2">Para testing, puedes usar:</p>
            <div className="text-xs font-mono text-yellow-800 space-y-1">
              <div>Client ID: demo_client_id</div>
              <div>Client Secret: demo_client_secret</div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                clientId: 'demo_client_id',
                clientSecret: 'demo_client_secret'
              })}
              className="mt-2 text-yellow-800 hover:text-yellow-900 text-sm underline"
            >
              Usar credenciales de prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;