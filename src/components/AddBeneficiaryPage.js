import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  CreditCard, 
  Phone, 
  Mail, 
  Building, 
  CheckCircle, 
  AlertCircle,
  Loader,
  ChevronRight,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import backendAPI from '../services/backendApi';
import { useAuth } from '../context/AuthContext';

const AddBeneficiaryPage = ({ onNavigate, onBeneficiaryCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState({
    account: false,
    swift: false
  });

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    firstName: '',
    lastName: '',
    alias: '',
    
    // Step 2: Location
    countryDestinationId: 23, // Default Spain
    city: '',
    province: '',
    address: '',
    postalCode: '',
    phone: '',
    
    // Step 3: Account Details
    accountNumber: '',
    swift: '',
    routingNumber: '',
    currency: '',
    
    // Step 4: Additional Details
    beneficiaryType: 2, // External beneficiary
    beneficiaryPersonType: 1, // Person
    paymentType: 2, // SWIFT
    type: 7, // Bank transfer
    userRelationTypeId: 2, // Other
    documentNumber: '',
    documentTypeId: null,
    documentExpirationDate: null,
    correspondent: null,
    searchBy: 1,
    searchValue: '',
    secondLastName: ''
  });

  // Validation states
  const [validation, setValidation] = useState({
    accountValid: null,
    swiftValid: null,
    accountMessage: '',
    swiftMessage: '',
    swiftEntityData: null
  });

  // Countries list (simplified for now)
  const [countries] = useState([
    { id: 23, name: 'España', code: 'ES' },
    { id: 1, name: 'Estados Unidos', code: 'US' },
    { id: 52, name: 'Francia', code: 'FR' },
    { id: 84, name: 'Alemania', code: 'DE' },
    { id: 76, name: 'Italia', code: 'IT' }
  ]);

  // Step configuration
  const steps = [
    { 
      number: 1, 
      title: 'Información Básica', 
      icon: User,
      description: 'Datos personales del beneficiario'
    },
    { 
      number: 2, 
      title: 'Ubicación', 
      icon: MapPin,
      description: 'Dirección y contacto'
    },
    { 
      number: 3, 
      title: 'Datos Bancarios', 
      icon: CreditCard,
      description: 'Información de la cuenta'
    },
    { 
      number: 4, 
      title: 'Confirmación', 
      icon: CheckCircle,
      description: 'Revisar y crear'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation when user changes account number or swift
    if (name === 'accountNumber') {
      setValidation(prev => ({
        ...prev,
        accountValid: null,
        accountMessage: ''
      }));
    }
    if (name === 'swift') {
      setValidation(prev => ({
        ...prev,
        swiftValid: null,
        swiftMessage: '',
        swiftEntityData: null
      }));
    }
  };

  // Validate account number
  const validateAccountNumber = async () => {
    if (!formData.accountNumber || !formData.countryDestinationId) {
      return;
    }

    setValidationLoading(prev => ({ ...prev, account: true }));

    try {
      const result = await backendAPI.validateAccountNumber(user?.id, {
        countryDestinationId: formData.countryDestinationId,
        accountNumber: formData.accountNumber,
        paymentType: formData.paymentType,
        currency: formData.currency,
        routingNumber: formData.routingNumber
      });

      if (result.success) {
        setValidation(prev => ({
          ...prev,
          accountValid: result.data.valid,
          accountMessage: result.data.valid ? '✅ Número de cuenta válido' : '❌ Número de cuenta inválido'
        }));
      }
    } catch (error) {
      console.error('Error validating account:', error);
      setValidation(prev => ({
        ...prev,
        accountValid: false,
        accountMessage: '❌ Error validando cuenta'
      }));
    } finally {
      setValidationLoading(prev => ({ ...prev, account: false }));
    }
  };

  // Validate SWIFT code
  const validateSwiftCode = async () => {
    if (!formData.swift || !formData.countryDestinationId) {
      return;
    }

    setValidationLoading(prev => ({ ...prev, swift: true }));

    try {
      const result = await backendAPI.validateSwiftCode(user?.id, {
        countryDestinationId: formData.countryDestinationId,
        swift: formData.swift
      });

      if (result.success) {
        setValidation(prev => ({
          ...prev,
          swiftValid: result.data.valid,
          swiftMessage: result.data.valid ? '✅ Código SWIFT válido' : '❌ Código SWIFT inválido',
          swiftEntityData: result.data.entityData
        }));
      }
    } catch (error) {
      console.error('Error validating SWIFT:', error);
      setValidation(prev => ({
        ...prev,
        swiftValid: false,
        swiftMessage: '❌ Error validando SWIFT'
      }));
    } finally {
      setValidationLoading(prev => ({ ...prev, swift: false }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const beneficiaryData = {
        accountNumber: formData.accountNumber,
        address: formData.address,
        alias: formData.alias,
        beneficiaryType: formData.beneficiaryType,
        beneficiaryPersonType: formData.beneficiaryPersonType,
        city: formData.city,
        correspondent: formData.correspondent,
        countryDestinationId: formData.countryDestinationId,
        currency: formData.currency,
        documentExpirationDate: formData.documentExpirationDate,
        documentNumber: formData.documentNumber,
        documentTypeId: formData.documentTypeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        paymentType: formData.paymentType,
        phone: formData.phone,
        postalCode: formData.postalCode,
        province: formData.province,
        routingNumber: formData.routingNumber,
        searchBy: formData.searchBy,
        searchValue: formData.searchValue,
        secondLastName: formData.secondLastName,
        swift: formData.swift,
        type: formData.type,
        userRelationTypeId: formData.userRelationTypeId
      };

      const result = await backendAPI.createBeneficiary(user?.id, beneficiaryData);

      if (result.success) {
        toast.success('Beneficiario creado exitosamente');
        if (onBeneficiaryCreated) {
          onBeneficiaryCreated(result.data);
        }
        onNavigate('beneficiaries');
      } else {
        toast.error(result.error || 'Error creando beneficiario');
      }
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      toast.error('Error creando beneficiario');
    } finally {
      setIsLoading(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step validation
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return formData.firstName && formData.lastName && formData.alias;
      case 2:
        return formData.city && formData.province && formData.address;
      case 3:
        return formData.accountNumber && formData.swift && validation.accountValid && validation.swiftValid;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('beneficiaries')}
          className="flex items-center text-tropipay-600 hover:text-tropipay-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Beneficiarios
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agregar Nuevo Beneficiario
        </h1>
        <p className="text-gray-600">
          Completa la información paso a paso para agregar un nuevo beneficiario
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isValid = isStepValid(step.number);
            
            return (
              <div key={step.number} className="flex items-center">
                <div className={`
                  flex flex-col items-center ${index !== steps.length - 1 ? 'flex-1' : ''}
                `}>
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2
                    ${isCompleted ? 'bg-green-500 border-green-500' : 
                      isActive ? (isValid ? 'bg-tropipay-500 border-tropipay-500' : 'bg-amber-500 border-amber-500') : 
                      'bg-gray-200 border-gray-300'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : isActive && !isValid ? (
                      <AlertCircle className="w-6 h-6 text-white" />
                    ) : (
                      <StepIcon className={`w-6 h-6 ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`font-medium text-sm ${isActive ? 'text-tropipay-600' : 'text-gray-500'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {index !== steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-4 hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="card p-8">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Información Básica del Beneficiario
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Nombre *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Juan"
                  required
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Apellido *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Pérez"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 mr-2" />
                Alias / Nombre para mostrar *
              </label>
              <input
                type="text"
                name="alias"
                value={formData.alias}
                onChange={handleInputChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                placeholder="Juan Pérez - Banco Santander"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Este es el nombre que verás en tu lista de beneficiarios
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Ubicación y Contacto
            </h2>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 mr-2" />
                País *
              </label>
              <select
                name="countryDestinationId"
                value={formData.countryDestinationId}
                onChange={handleInputChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                required
              >
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Ciudad *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Barcelona"
                  required
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Provincia *
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Barcelona"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                Dirección Completa *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                placeholder="Calle Gran Vía, 123, 2º A"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Código Postal
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="08015"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 mr-2" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="+34 654 291 447"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Banking Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Datos Bancarios
            </h2>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 mr-2" />
                Número de Cuenta (IBAN) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  onBlur={validateAccountNumber}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="BE52 9678 6925 0409"
                  required
                />
                {validationLoading.account && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>
              {validation.accountMessage && (
                <p className={`text-sm mt-1 ${validation.accountValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.accountMessage}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 mr-2" />
                Código SWIFT/BIC *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="swift"
                  value={formData.swift}
                  onChange={handleInputChange}
                  onBlur={validateSwiftCode}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="TRWIBEB1XXX"
                  required
                />
                {validationLoading.swift && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>
              {validation.swiftMessage && (
                <p className={`text-sm mt-1 ${validation.swiftValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.swiftMessage}
                </p>
              )}
              {validation.swiftEntityData && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    ℹ️ Información del banco verificada correctamente
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 mr-2" />
                  Número de Ruta (Routing)
                </label>
                <input
                  type="text"
                  name="routingNumber"
                  value={formData.routingNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Moneda
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                >
                  <option value="">Seleccionar moneda</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="GBP">GBP - Libra Esterlina</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Confirmar Información
            </h2>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">Resumen del Beneficiario</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Nombre:</span>
                  <p className="text-gray-900">{formData.firstName} {formData.lastName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Alias:</span>
                  <p className="text-gray-900">{formData.alias}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ubicación:</span>
                  <p className="text-gray-900">{formData.city}, {formData.province}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Dirección:</span>
                  <p className="text-gray-900">{formData.address}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Cuenta:</span>
                  <p className="text-gray-900">{formData.accountNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">SWIFT:</span>
                  <p className="text-gray-900">{formData.swift}</p>
                </div>
                {formData.phone && (
                  <div>
                    <span className="font-medium text-gray-600">Teléfono:</span>
                    <p className="text-gray-900">{formData.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 text-sm font-medium mb-1">
                    Importante
                  </p>
                  <p className="text-blue-700 text-sm">
                    Verifica que todos los datos bancarios sean correctos. 
                    Los errores en esta información pueden causar retrasos o fallos en las transferencias.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </button>

          <div className="flex space-x-3">
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                disabled={!isStepValid(currentStep)}
                className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !isStepValid(currentStep)}
                className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Crear Beneficiario
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBeneficiaryPage;