import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Key,
  Settings,
  Bell,
  CreditCard,
  LogOut,
  Edit3,
  Check,
  X
} from 'lucide-react';
import backendAPI from '../services/backendApi';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.profile?.name || '',
    surname: user?.profile?.surname || '',
    email: user?.profile?.email || '',
    phone: user?.profile?.phone || ''
  });

  const userProfile = user?.profile || {};

  const handleInputChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    // Aquí iría la lógica para actualizar el perfil
    console.log('Saving profile:', profileData);
    setEditMode(false);
  };

  const handleCancel = () => {
    setProfileData({
      name: userProfile.name || '',
      surname: userProfile.surname || '',
      email: userProfile.email || '',
      phone: userProfile.phone || ''
    });
    setEditMode(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return backendAPI.formatDate(dateString);
  };

  const getKycLevelText = (level) => {
    const levels = {
      0: { text: 'Sin verificar', color: 'bg-red-100 text-red-800' },
      1: { text: 'Básico', color: 'bg-yellow-100 text-yellow-800' },
      2: { text: 'Intermedio', color: 'bg-blue-100 text-blue-800' },
      3: { text: 'Avanzado', color: 'bg-green-100 text-green-800' },
      4: { text: 'Completo', color: 'bg-tropipay-100 text-tropipay-800' }
    };
    
    return levels[level] || levels[0];
  };

  const kycLevel = getKycLevelText(userProfile.kycLevel || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Mi Perfil
          </h1>
          <p className="text-gray-600">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Perfil</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            {/* Avatar */}
            <div className="bg-tropipay-100 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <User className="w-12 h-12 text-tropipay-600" />
            </div>
            
            {/* Name */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {userProfile.name} {userProfile.surname}
            </h2>
            <p className="text-gray-500 mb-4">
              {userProfile.email}
            </p>

            {/* KYC Status */}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${kycLevel.color}`}>
                <Shield className="w-4 h-4 mr-2" />
                Verificación {kycLevel.text}
              </span>
            </div>

            {/* Account Info */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Client ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {user?.client_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  userProfile.state === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {userProfile.state === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">
                    {userProfile.name || 'No especificado'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido
                </label>
                {editMode ? (
                  <input
                    type="text"
                    name="surname"
                    value={profileData.surname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg">
                    {userProfile.surname || 'No especificado'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                {editMode ? (
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {userProfile.email || 'No especificado'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {userProfile.phone || 'No especificado'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Detalles de Cuenta
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Cuenta creada</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(userProfile.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">2FA Habilitado</p>
                    <p className="text-sm text-gray-600">
                      {userProfile.twoFactorEnabled ? 'Sí' : 'No'} configurado
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  userProfile.twoFactorEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userProfile.twoFactorEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Último acceso</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(userProfile.lastLogin)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Acciones Rápidas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Key className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">Cambiar Contraseña</span>
              </button>

              <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Shield className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">Configurar 2FA</span>
              </button>

              <button className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">Notificaciones</span>
              </button>

              <button
                onClick={logout}
                className="flex items-center justify-center p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-700"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;