import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  Users, 
  CreditCard, 
  Calculator, 
  Shield, 
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import backendAPI from '../services/backendApi';

const TransferPage = ({ selectedBeneficiary, onNavigate }) => {
  const { accounts, beneficiaries, simulateTransfer, sendTransfer, requestTransferSMS, user, isLoading } = useAuth();
  const [step, setStep] = useState(1); // 1: Form, 2: Simulate, 3: 2FA, 4: Success
  const [formData, setFormData] = useState({
    beneficiaryId: selectedBeneficiary?.id || selectedBeneficiary?.beneficiary_id || '',
    accountId: '',
    amount: '',
    currency: 'USD',
    destinationCurrency: 'USD',
    concept: '',
    reason: 'Transferencia'
  });
  const [simulation, setSimulation] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  // Preseleccionar cuenta principal si existe
  useEffect(() => {
    if (accounts.length > 0 && !formData.accountId) {
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
      setFormData(prev => ({
        ...prev,
        accountId: defaultAccount.id,
        currency: defaultAccount.currency
      }));
    }
  }, [accounts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`📝 Input change: ${name} = ${value} (type: ${typeof value})`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambia la cuenta, actualizar la moneda
    if (name === 'accountId') {
      const selectedAccount = accounts.find(acc => acc.id == value);
      if (selectedAccount) {
        setFormData(prev => ({
          ...prev,
          currency: selectedAccount.currency
        }));
      }
    }
  };

  const handleSimulate = async () => {
    try {
      console.log('🔍 Debugging transfer simulation:');
      console.log('📝 Form data:', formData);
      console.log('💳 Available accounts:', accounts.map(acc => ({ id: acc.id, alias: acc.alias })));
      console.log('👥 Available beneficiaries:', beneficiaries.map(b => ({ 
        id: b.id || b.beneficiary_id, 
        alias: b.alias,
        name: `${b.first_name} ${b.last_name}`
      })));

      const selectedAccount = accounts.find(acc => acc.id == formData.accountId);
      const selectedBenef = beneficiaries.find(b => 
        (b.id || b.beneficiary_id) == formData.beneficiaryId // Cambiado a == para comparación flexible
      );

      console.log('🎯 Selected account:', selectedAccount);
      console.log('🎯 Selected beneficiary:', selectedBenef);
      console.log('🔢 BeneficiaryId type:', typeof formData.beneficiaryId, formData.beneficiaryId);
      console.log('🔢 AccountId type:', typeof formData.accountId, formData.accountId);

      if (!selectedAccount || !selectedBenef) {
        console.log('❌ Validation failed - Account or beneficiary not found');
        toast.error('Por favor selecciona cuenta y beneficiario');
        return;
      }

      const simulationData = {
        depositaccountId: parseInt(formData.beneficiaryId),
        accountId: parseInt(formData.accountId),
        currencyToPay: formData.currency,
        currencyToGet: formData.destinationCurrency,
        amountToPay: parseFloat(formData.amount)
      };

      const result = await simulateTransfer(simulationData);
      
      if (result.success) {
        setSimulation(result.data);
        setStep(2);
      }
    } catch (error) {
      console.error('Error simulating transfer:', error);
    }
  };

  const handleSend2FACode = async () => {
    // Verificar tipo de 2FA del usuario
    const twoFaType = user?.profile?.twoFaType;
    console.log(`🔐 Tipo de 2FA del usuario: ${twoFaType} (1=SMS, 2=Google Authenticator)`);
    
    if (twoFaType === 2) {
      // Google Authenticator - Ir directamente al paso de verificación
      console.log('📱 Usuario tiene Google Authenticator configurado - Saltando envío de SMS');
      toast('Ingresa el código de Google Authenticator', {
        icon: '🔑',
        duration: 3000,
      });
      setStep(3);
      return;
    }
    
    // Tipo 1 (SMS) o sin tipo definido - Enviar SMS
    setSendingCode(true);
    
    try {
      // Obtener número de teléfono del perfil del usuario
      const phoneNumber = user?.profile?.phone || user?.profile?.phoneNumber || '+1234567890';
      
      console.log(`📱 Solicitando código SMS para: ${phoneNumber}`);
      
      const result = await requestTransferSMS(phoneNumber);
      
      if (result.success) {
        // Verificar si estamos en modo demo
        if (result.isDemoMode && result.demoCode) {
          setGeneratedCode(result.demoCode);
          console.log(`🧪 Código demo: ${result.demoCode}`);
        } else {
          // En producción, no almacenar el código
          setGeneratedCode('');
        }
        setStep(3);
      } else {
        toast.error(result.error || 'Error al enviar código SMS');
      }
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      toast.error('Error al enviar código SMS');
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    // Validar código en modo demo
    if (generatedCode) {
      if (twoFACode !== generatedCode) {
        toast.error('Código incorrecto');
        return;
      }
    }
    // En producción, el código se valida en el servidor al enviar la transferencia

    setProcessingTransfer(true);

    try {
      const transferData = {
        depositaccountId: parseInt(formData.beneficiaryId),
        accountId: parseInt(formData.accountId),
        currency: formData.currency,
        destinationCurrency: formData.destinationCurrency,
        amount: parseFloat(formData.amount),
        destinationAmount: simulation?.finalAmount || parseFloat(formData.amount),
        conceptTransfer: formData.concept || 'Transferencia',
        reasonDes: formData.reason,
        reasonId: 9, // ID genérico para transferencias
        paymentMethod: 'TPP',
        securityCode: twoFACode
      };

      const result = await sendTransfer(transferData);
      
      if (result.success) {
        setTransferResult(result.data);
        setStep(4);
        toast.success('¡Transferencia enviada exitosamente!');
      }
    } catch (error) {
      console.error('Error sending transfer:', error);
    } finally {
      setProcessingTransfer(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id == formData.accountId);
  const selectedBenef = beneficiaries.find(b => 
    (b.id || b.beneficiary_id) == formData.beneficiaryId
  );

  const isFormValid = formData.beneficiaryId && formData.accountId && formData.amount && 
                     parseFloat(formData.amount) > 0;

  if (step === 4 && transferResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Transferencia Exitosa!
          </h1>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-4">Detalles de la Transferencia</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Código de Referencia:</span>
                <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                  {transferResult.bankOrderCode || transferResult.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto Enviado:</span>
                <span className="font-semibold">
                  {backendAPI.formatAmount(Math.abs(transferResult.amount), transferResult.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Beneficiario:</span>
                <span>{selectedBenef?.alias || `${selectedBenef?.first_name} ${selectedBenef?.last_name}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {transferResult.state === 'charged' ? 'Procesado' : transferResult.state}
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                setStep(1);
                setFormData({
                  ...formData,
                  amount: '',
                  concept: ''
                });
                setSimulation(null);
                setTwoFACode('');
                setTransferResult(null);
              }}
              className="flex-1 btn-secondary"
            >
              Nueva Transferencia
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex-1 btn-primary"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Enviar Transferencia
        </h1>
        <p className="text-gray-600">
          Transfiere dinero a tus beneficiarios de forma segura
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3, 4].map((stepNum) => (
            <React.Fragment key={stepNum}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= stepNum 
                  ? 'bg-tropipay-500 border-tropipay-500 text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                {stepNum}
              </div>
              {stepNum < 4 && (
                <div className={`w-12 h-0.5 ${
                  step > stepNum ? 'bg-tropipay-500' : 'bg-gray-300'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-center mt-2 text-sm text-gray-600">
          <div className="flex space-x-12">
            <span>Datos</span>
            <span>Simular</span>
            <span>2FA</span>
            <span>Confirmar</span>
          </div>
        </div>
      </div>

      {/* Step 1: Form */}
      {step === 1 && (
        <div className="card p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Datos de la Transferencia
              </h2>

              {/* Beneficiary Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  Beneficiario *
                </label>
                <select
                  name="beneficiaryId"
                  value={formData.beneficiaryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar beneficiario</option>
                  {beneficiaries.map(beneficiary => (
                    <option key={beneficiary.id || beneficiary.beneficiary_id} value={beneficiary.id || beneficiary.beneficiary_id}>
                      {beneficiary.alias || `${beneficiary.first_name} ${beneficiary.last_name}`}
                      {beneficiary.account_number && ` - ${beneficiary.account_number.slice(-4)}`}
                    </option>
                  ))}
                </select>
                {beneficiaries.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    <button
                      onClick={() => onNavigate('beneficiaries')}
                      className="underline hover:no-underline"
                    >
                      Agregar beneficiarios
                    </button> para poder enviar dinero
                  </p>
                )}
              </div>

              {/* Account Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Cuenta de Origen *
                </label>
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.alias || `Cuenta ${account.currency}`} - 
                      {backendAPI.formatAmount(account.balance || account.available || 0, account.currency)}
                      {account.isDefault && ' (Principal)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calculator className="w-4 h-4 mr-2" />
                  Monto a Enviar *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    {formData.currency}
                  </div>
                </div>
                {selectedAccount && formData.amount && parseFloat(formData.amount) > (selectedAccount.balance || selectedAccount.available || 0) && (
                  <p className="text-red-600 text-sm mt-1 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Saldo insuficiente
                  </p>
                )}
              </div>

              {/* Currency Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moneda Origen
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moneda Destino
                  </label>
                  <select
                    name="destinationCurrency"
                    value={formData.destinationCurrency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CUP">CUP</option>
                  </select>
                </div>
              </div>

              {/* Concept */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concepto (Opcional)
                </label>
                <input
                  type="text"
                  name="concept"
                  value={formData.concept}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                  placeholder="Descripción de la transferencia"
                />
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="bg-gray-50 p-6 rounded-lg h-fit">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resumen
              </h3>
              
              <div className="space-y-4">
                {selectedBenef && (
                  <div>
                    <p className="text-sm text-gray-600">Para:</p>
                    <p className="font-semibold">
                      {selectedBenef.alias || `${selectedBenef.first_name} ${selectedBenef.last_name}`}
                    </p>
                    <p className="text-sm text-gray-500 font-mono">
                      {selectedBenef.account_number}
                    </p>
                  </div>
                )}

                {selectedAccount && (
                  <div>
                    <p className="text-sm text-gray-600">Desde:</p>
                    <p className="font-semibold">
                      {selectedAccount.alias || `Cuenta ${selectedAccount.currency}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      Disponible: {backendAPI.formatAmount(selectedAccount.balance || selectedAccount.available || 0, selectedAccount.currency)}
                    </p>
                  </div>
                )}

                {formData.amount && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monto:</span>
                      <span className="font-bold text-lg">
                        {parseFloat(formData.amount).toLocaleString('es-ES', {
                          style: 'currency',
                          currency: formData.currency
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSimulate}
              disabled={!isFormValid || isLoading}
              className="btn-primary flex items-center space-x-2"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Simulation Results */}
      {step === 2 && simulation && (
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Confirma los Detalles
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Calculator className="w-4 h-4 mr-2" />
                  Simulación de Costos
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monto a enviar:</span>
                    <span className="font-semibold">
                      {parseFloat(formData.amount).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: formData.currency
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisión estimada:</span>
                    <span>
                      {backendAPI.formatAmount(simulation.estimatedFee || 0, formData.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo de cambio:</span>
                    <span>{simulation.exchangeRate || 1}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                    <span>El beneficiario recibirá:</span>
                    <span>
                      {parseFloat(simulation.finalAmount || formData.amount).toLocaleString('es-ES', {
                        style: 'currency',
                        currency: formData.destinationCurrency
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-amber-800 font-semibold">Tiempo de Procesamiento</h4>
                    <p className="text-amber-700 text-sm">
                      {simulation.processingTime || 'Inmediato'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Detalles de la Transferencia</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Beneficiario:</span>
                  <span>{selectedBenef?.alias || `${selectedBenef?.first_name} ${selectedBenef?.last_name}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuenta destino:</span>
                  <span className="font-mono">{selectedBenef?.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Desde cuenta:</span>
                  <span>{selectedAccount?.alias || `Cuenta ${selectedAccount?.currency}`}</span>
                </div>
                {formData.concept && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Concepto:</span>
                    <span>{formData.concept}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary"
            >
              Modificar
            </button>
            <button
              onClick={handleSend2FACode}
              disabled={sendingCode}
              className="btn-primary flex items-center space-x-2"
            >
              {sendingCode ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>
                    {user?.profile?.twoFaType === 2 ? 'Continuar' : 'Enviar código SMS'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 2FA Verification */}
      {step === 3 && (
        <div className="card p-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="bg-tropipay-100 p-4 rounded-full w-fit mx-auto mb-6">
              {user?.profile?.twoFaType === 2 ? (
                <Key className="w-8 h-8 text-tropipay-600" />
              ) : (
                <Smartphone className="w-8 h-8 text-tropipay-600" />
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verificación de Seguridad
            </h2>
            <p className="text-gray-600 mb-6">
              {user?.profile?.twoFaType === 2 ? (
                'Ingresa el código de 6 dígitos de Google Authenticator'
              ) : (
                'Hemos enviado un código de 6 dígitos a tu teléfono móvil'
              )}
            </p>

            {/* Mensaje para usuarios con Google Authenticator */}
            {user?.profile?.twoFaType === 2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium mb-1">
                      Google Authenticator
                    </p>
                    <p className="text-blue-700 text-sm">
                      Abre tu aplicación Google Authenticator y usa el código de TropiPay
                    </p>
                  </div>
                </div>
              </div>
            )}

            {generatedCode && user?.profile?.twoFaType !== 2 && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-lg">🧪</span>
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">
                      Modo Demo
                    </p>
                    <p className="text-yellow-800 text-sm">
                      <strong>Código de prueba:</strong> {generatedCode}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 btn-secondary"
              >
                Atrás
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={processingTransfer || twoFACode.length !== 6}
                className="flex-1 btn-primary"
              >
                {processingTransfer ? 'Procesando...' : 'Confirmar Envío'}
              </button>
            </div>

            {/* Solo mostrar reenvío para usuarios con SMS (tipo 1) */}
            {user?.profile?.twoFaType !== 2 && (
              <button
                onClick={handleSend2FACode}
                disabled={sendingCode}
                className="text-tropipay-600 hover:text-tropipay-700 text-sm mt-4"
              >
                {sendingCode ? 'Enviando...' : 'Reenviar código'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferPage;