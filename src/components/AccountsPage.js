import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  TrendingUp, 
  Activity,
  DollarSign,
  Euro,
  Star,
  MoreVertical
} from 'lucide-react';
import backendAPI from '../services/backendApi';

const AccountsPage = ({ onNavigate }) => {
  const { accounts, refreshAccounts, isLoading } = useAuth();
  const [showBalances, setShowBalances] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAccounts();
    setRefreshing(false);
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'USD':
        return <DollarSign className="w-6 h-6" />;
      case 'EUR':
        return <Euro className="w-6 h-6" />;
      default:
        return <DollarSign className="w-6 h-6" />;
    }
  };

  const getCurrencyColor = (currency) => {
    switch (currency) {
      case 'USD':
        return 'from-green-500 to-green-600';
      case 'EUR':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatBalance = (amount, currency) => {
    return backendAPI.formatAmount(amount, currency);
  };

  // Calcular totales
  const totalBalance = accounts.reduce((sum, account) => {
    // Convertir todo a USD para el total (simplificado)
    const rate = account.currency === 'EUR' ? 1.1 : 1;
    return sum + (account.balance || account.available || 0) * rate;
  }, 0);

  const totalBlocked = accounts.reduce((sum, account) => {
    const rate = account.currency === 'EUR' ? 1.1 : 1;
    return sum + (account.blocked || 0) * rate;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Mis Cuentas
          </h1>
          <p className="text-gray-600">
            Gestiona tus cuentas y balances de TropiPay
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="btn-secondary flex items-center space-x-2"
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showBalances ? 'Ocultar' : 'Mostrar'}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Balance Total</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {showBalances ? formatBalance(totalBalance, 'USD') : '•••••'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Equivalente en USD</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Fondos Bloqueados</h3>
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {showBalances ? formatBalance(totalBlocked, 'USD') : '•••••'}
          </p>
          <p className="text-sm text-gray-500 mt-1">En todas las cuentas</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Cuentas Activas</h3>
            <CreditCard className="w-5 h-5 text-tropipay-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {accounts.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Cuentas disponibles</p>
        </div>
      </div>

      {/* Accounts List */}
      {isLoading && accounts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="relative overflow-hidden"
            >
              {/* Card with gradient background */}
              <div className={`bg-gradient-to-br ${getCurrencyColor(account.currency)} p-6 rounded-xl text-white relative`}>
                {/* Default account badge */}
                {account.isDefault && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-white bg-opacity-20 p-1 rounded-full">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Currency Icon */}
                <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mb-4">
                  {getCurrencyIcon(account.currency)}
                </div>

                {/* Account Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">
                    {account.alias || `Cuenta ${account.currency}`}
                  </h3>
                  <p className="text-sm opacity-75">
                    {account.accountNumber ? 
                      `•••• •••• •••• ${account.accountNumber.slice(-4)}` : 
                      account.currency
                    }
                  </p>
                </div>

                {/* Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">Disponible</span>
                    <span className="text-xl font-bold">
                      {showBalances ? formatBalance(account.balance || account.available || 0, account.currency) : '•••••'}
                    </span>
                  </div>
                  
                  {account.blocked > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-75">Bloqueado</span>
                      <span className="text-sm">
                        {showBalances ? formatBalance(account.blocked, account.currency) : '•••••'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Type */}
                <div className="absolute bottom-4 right-4 text-xs opacity-50">
                  {account.type || 'MAIN'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white p-4 rounded-b-xl shadow-sm border-t">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onNavigate('movements', { accountId: account.id, account })}
                    className="btn-secondary text-xs py-2 flex items-center justify-center space-x-1"
                  >
                    <Activity className="w-3 h-3" />
                    <span>Movimientos</span>
                  </button>
                  <button
                    onClick={() => onNavigate('transfer', { selectedAccountId: account.id })}
                    className="btn-primary text-xs py-2 flex items-center justify-center space-x-1"
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>Enviar</span>
                  </button>
                  <button className="btn-secondary text-xs py-2 flex items-center justify-center space-x-1">
                    <MoreVertical className="w-3 h-3" />
                    <span>Más</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay cuentas disponibles
          </h3>
          <p className="text-gray-500 mb-6">
            Parece que no tienes cuentas configuradas en tu perfil de TropiPay.
          </p>
          <button
            onClick={handleRefresh}
            className="btn-primary"
          >
            Actualizar Cuentas
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 card p-6 bg-gradient-to-r from-tropipay-50 to-blue-50">
        <div className="flex items-start space-x-4">
          <div className="bg-tropipay-100 p-3 rounded-lg flex-shrink-0">
            <CreditCard className="w-6 h-6 text-tropipay-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              ¿Necesitas más cuentas?
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Las cuentas se crean automáticamente cuando recibes dinero en diferentes monedas. 
              También puedes solicitar cuentas adicionales desde tu panel de TropiPay.
            </p>
            <div className="flex space-x-3">
              <button className="text-tropipay-600 hover:text-tropipay-700 text-sm font-medium">
                Más información →
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Contactar soporte →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;