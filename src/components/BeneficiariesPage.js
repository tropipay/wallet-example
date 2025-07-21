import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  CreditCard, 
  Globe,
  Edit3,
  Trash2,
  Phone,
  Mail,
  X,
  Building,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

const BeneficiariesPage = ({ onNavigate }) => {
  const { beneficiaries, refreshBeneficiaries, createBeneficiary, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    accountNumber: '',
    email: '',
    phone: '',
    alias: '',
    countryDestinationId: 1, // Cuba por defecto
    type: 0
  });
  const [formLoading, setFormLoading] = useState(false);

  // Cargar beneficiarios cuando se monta el componente
  useEffect(() => {
    refreshBeneficiaries();
  }, [refreshBeneficiaries]);

  // Filtrar beneficiarios
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const searchLower = searchTerm.toLowerCase();
    return (
      beneficiary.first_name?.toLowerCase().includes(searchLower) ||
      beneficiary.last_name?.toLowerCase().includes(searchLower) ||
      beneficiary.alias?.toLowerCase().includes(searchLower) ||
      beneficiary.account_number?.includes(searchTerm) ||
      beneficiary.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const beneficiaryData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        accountNumber: formData.accountNumber,
        email: formData.email,
        phone: formData.phone,
        alias: formData.alias || `${formData.firstName} ${formData.lastName}`,
        countryDestinationId: formData.countryDestinationId,
        type: formData.type
      };

      const result = await createBeneficiary(beneficiaryData);
      
      if (result.success) {
        setShowAddForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          accountNumber: '',
          email: '',
          phone: '',
          alias: '',
          countryDestinationId: 1,
          type: 0
        });
      }
    } catch (error) {
      console.error('Error creating beneficiary:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const formatAccountNumber = (accountNumber) => {
    if (!accountNumber) return '';
    // Formato para cuentas bancarias (simplificado)
    return accountNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  // Determinar si es cuenta interna (type 9 = TropiPay)
  const isInternalAccount = (type) => {
    return type === 9;
  };

  // Obtener iniciales para avatar
  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  // Obtener el texto del tipo de cuenta
  const getAccountTypeText = (type) => {
    return isInternalAccount(type) ? 'Cuenta TropiPay' : 'Cuenta Externa';
  };

  // Obtener color para el tipo de cuenta
  const getAccountTypeColor = (type) => {
    return isInternalAccount(type) 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Mis Beneficiarios
          </h1>
          <p className="text-gray-600">
            Gestiona tus contactos para envío de dinero
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => onNavigate('add-beneficiary')}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Beneficiario</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar beneficiarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add Beneficiary Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Agregar Beneficiario
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Cuenta *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="1234567890123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alias
                </label>
                <input
                  type="text"
                  name="alias"
                  value={formData.alias}
                  onChange={handleInputChange}
                  placeholder="Nombre descriptivo (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 btn-primary"
                >
                  {formLoading ? 'Creando...' : 'Crear Beneficiario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Beneficiaries List */}
      {isLoading && beneficiaries.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredBeneficiaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBeneficiaries.map((beneficiary) => (
            <div key={beneficiary.id || beneficiary.beneficiary_id} className="card-hover p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {/* Avatar con imagen o iniciales */}
                  <div className="relative">
                    {beneficiary.avatarUrl ? (
                      <img 
                        src={beneficiary.avatarUrl} 
                        alt={`Avatar de ${beneficiary.first_name}`}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm ${
                        beneficiary.avatarUrl ? 'hidden' : 'bg-tropipay-100 text-tropipay-600'
                      }`}
                      style={beneficiary.avatarUrl ? { display: 'none' } : {}}
                    >
                      {getInitials(beneficiary.firstName || beneficiary.first_name, beneficiary.lastName || beneficiary.last_name)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {beneficiary.alias || `${beneficiary.firstName || beneficiary.first_name} ${beneficiary.lastName || beneficiary.last_name}`}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(beneficiary.type)}`}>
                        {isInternalAccount(beneficiary.type) ? (
                          <Home className="w-3 h-3 mr-1" />
                        ) : (
                          <Building className="w-3 h-3 mr-1" />
                        )}
                        {getAccountTypeText(beneficiary.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {beneficiary.firstName || beneficiary.first_name} {beneficiary.lastName || beneficiary.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Número de Cuenta */}
                {beneficiary.accountNumber && (
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 font-mono truncate">
                        {formatAccountNumber(beneficiary.accountNumber)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Número de cuenta
                      </p>
                    </div>
                  </div>
                )}

                {beneficiary.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">
                      {beneficiary.email}
                    </span>
                  </div>
                )}

                {beneficiary.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      {beneficiary.phone}
                    </span>
                  </div>
                )}

                {/* País - Solo mostrar para cuentas externas */}
                {!isInternalAccount(beneficiary.type) && beneficiary.countryDestination && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {beneficiary.countryDestination.name}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {beneficiary.countryDestination.slug}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => onNavigate('transfer', { selectedBeneficiary: beneficiary })}
                  className="w-full btn-primary text-sm py-2"
                >
                  Enviar Dinero
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No se encontraron beneficiarios' : 'No hay beneficiarios'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda'
              : 'Agrega tus primeros beneficiarios para enviar dinero fácilmente'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => onNavigate('add-beneficiary')}
              className="btn-primary"
            >
              Agregar Primer Beneficiario
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BeneficiariesPage;