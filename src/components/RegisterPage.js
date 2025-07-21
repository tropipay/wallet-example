import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Wallet, User, Mail, Phone, Shield, Key, Globe, ArrowLeft } from 'lucide-react';
import backendAPI from '../services/backendApi';

const RegisterPage = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clientId: '',
    clientSecret: '',
    confirmClientSecret: '',
    environment: 'development'
  });
  
  const [showSecret, setShowSecret] = useState(false);
  const [showConfirmSecret, setShowConfirmSecret] = useState(false);
  const [environments, setEnvironments] = useState([]);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    setError(null);
    
    // Validaciones
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.clientId || !formData.clientSecret) {
      setError('Todos los campos marcados con * son obligatorios');
      return;
    }

    if (formData.clientSecret !== formData.confirmClientSecret) {
      setError('Las credenciales secretas no coinciden');
      return;
    }

    if (formData.clientSecret.length < 8) {
      setError('La credencial secreta debe tener al menos 8 caracteres');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await backendAPI.registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        environment: formData.environment
      });

      if (result.success) {
        setSuccess(true);
        setError(null);
      } else {
        setError(result.error || 'Error al registrar usuario');
      }
    } catch (error) {
      setError(error.message || 'Error al registrar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tropipay-50 to-tropipay-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Success Message */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-500 p-4 rounded-full shadow-lg">
                <Wallet className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Registro Exitoso!
            </h1>
            <p className="text-gray-600 mb-6">
              Tu cuenta ha sido creada correctamente
            </p>
          </div>

          {/* Success Card */}
          <div className="card p-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-green-800 font-medium mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Usuario Registrado
              </h3>
              <p className="text-green-700 text-sm mb-2">
                Tu usuario ha sido creado en el entorno: <strong>{formData.environment}</strong>
              </p>
              <p className="text-green-700 text-sm">
                Ya puedes iniciar sesión con tus credenciales.
              </p>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full btn-primary py-3 font-semibold flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir al Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tropipay-50 to-tropipay-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-tropipay-500 p-4 rounded-full shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crear Cuenta
          </h1>
          <p className="text-gray-600">
            Registra tu nueva cuenta de TropiPay Wallet
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Información Personal
              </h3>
              
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Nombre *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                    placeholder="Juan"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Apellido *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                    placeholder="Pérez"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 mr-2" />
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                  placeholder="juan.perez@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 mr-2" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                  placeholder="+1 234 567 8900"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Credenciales de API
              </h3>

              {/* Client ID */}
              <div>
                <label htmlFor="clientId" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 mr-2" />
                  Client ID *
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

              {/* Client Secret */}
              <div>
                <label htmlFor="clientSecret" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Client Secret *
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

              {/* Confirm Client Secret */}
              <div>
                <label htmlFor="confirmClientSecret" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 mr-2" />
                  Confirmar Client Secret *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmSecret ? 'text' : 'password'}
                    id="confirmClientSecret"
                    name="confirmClientSecret"
                    value={formData.confirmClientSecret}
                    onChange={handleChange}
                    className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent transition-colors"
                    placeholder="confirma_tu_client_secret"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmSecret(!showConfirmSecret)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              disabled={isLoading}
              className="w-full btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Registrando usuario...
                </div>
              ) : (
                'Registrar Usuario'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button
              onClick={onBackToLogin}
              className="text-tropipay-600 hover:text-tropipay-700 text-sm font-medium flex items-center justify-center space-x-2 mx-auto"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Login</span>
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
                Necesitas credenciales de TropiPay para crear tu cuenta. 
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
              onClick={() => setFormData(prev => ({
                ...prev,
                clientId: 'demo_client_id',
                clientSecret: 'demo_client_secret',
                confirmClientSecret: 'demo_client_secret'
              }))}
              className="mt-2 text-yellow-800 hover:text-yellow-900 text-sm underline"
              disabled={isLoading}
            >
              Usar credenciales de prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;