import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  Euro,
  Plus
} from 'lucide-react';
import backendAPI from '../services/backendApi';

const Dashboard = ({ onNavigate }) => {
  const { user, accounts, refreshAccounts, isLoading } = useAuth();
  const [showBalances, setShowBalances] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAccounts();
    setRefreshing(false);
  };

  // Calcular totales
  const totalBalance = accounts.reduce((sum, account) => {
    // Convertir todo a USD para el total (simplificado)
    const rate = account.currency === 'EUR' ? 1.1 : 1; // Tasa simplificada
    return sum + (account.balance || account.available || 0) * rate;
  }, 0);

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'USD':
        return <DollarSign className="w-5 h-5" />;
      case 'EUR':
        return <Euro className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const formatBalance = (amount, currency) => {
    return backendAPI.formatAmount(amount, currency);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-600">
            {user?.profile?.name ? `${user.profile.name} ${user.profile.surname || ''}` : 'Usuario'}
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

      {/* Balance Total Card */}
      <div className="card p-6 mb-8 bg-gradient-to-r from-tropipay-500 to-tropipay-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold opacity-90">Balance Total</h2>
          <TrendingUp className="w-6 h-6 opacity-75" />
        </div>
        <div className="text-3xl font-bold mb-2">
          {showBalances ? formatBalance(totalBalance, 'USD') : '•••••'}
        </div>
        <p className="opacity-75 text-sm">
          Equivalente en USD • {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Accounts Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Mis Cuentas</h2>
          <button
            onClick={() => onNavigate('accounts')}
            className="text-tropipay-600 hover:text-tropipay-700 font-medium text-sm"
          >
            Ver todas →
          </button>
        </div>

        {isLoading && accounts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="card-hover p-6 cursor-pointer transition-transform hover:scale-105"
                onClick={() => onNavigate('movements', { accountId: account.id, account })}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-tropipay-100 p-2 rounded-lg">
                      {getCurrencyIcon(account.currency)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {account.alias || `Cuenta ${account.currency}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {account.currency}
                        {account.isDefault && (
                          <span className="ml-2 bg-tropipay-100 text-tropipay-700 px-2 py-1 rounded-full text-xs">
                            Principal
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Disponible</span>
                    <span className="font-semibold text-gray-900">
                      {showBalances ? formatBalance(account.balance || account.available || 0, account.currency) : '•••••'}
                    </span>
                  </div>
                  
                  {account.blocked > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bloqueado</span>
                      <span className="font-semibold text-red-600">
                        {showBalances ? formatBalance(account.blocked, account.currency) : '•••••'}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total</span>
                      <span className="font-bold text-gray-900">
                        {showBalances ? formatBalance((account.balance || account.available || 0) + (account.blocked || 0), account.currency) : '•••••'}
                      </span>
                    </div>
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
            <p className="text-gray-500 mb-4">
              Parece que no tienes cuentas configuradas en tu perfil de TropiPay.
            </p>
            <button
              onClick={handleRefresh}
              className="btn-primary"
            >
              Actualizar
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate('transfer')}
            className="card-hover p-6 text-center group"
          >
            <div className="bg-tropipay-100 group-hover:bg-tropipay-200 p-3 rounded-lg w-fit mx-auto mb-3 transition-colors">
              <TrendingUp className="w-6 h-6 text-tropipay-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Enviar Dinero</h3>
            <p className="text-sm text-gray-500">Transferir a beneficiarios</p>
          </button>

          <button
            onClick={() => onNavigate('beneficiaries')}
            className="card-hover p-6 text-center group"
          >
            <div className="bg-blue-100 group-hover:bg-blue-200 p-3 rounded-lg w-fit mx-auto mb-3 transition-colors">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Beneficiarios</h3>
            <p className="text-sm text-gray-500">Gestionar contactos</p>
          </button>

          <button
            onClick={() => onNavigate('movements')}
            className="card-hover p-6 text-center group"
          >
            <div className="bg-purple-100 group-hover:bg-purple-200 p-3 rounded-lg w-fit mx-auto mb-3 transition-colors">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Movimientos</h3>
            <p className="text-sm text-gray-500">Historial de transacciones</p>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="card-hover p-6 text-center group"
          >
            <div className="bg-gray-100 group-hover:bg-gray-200 p-3 rounded-lg w-fit mx-auto mb-3 transition-colors">
              <CreditCard className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Mi Perfil</h3>
            <p className="text-sm text-gray-500">Información personal</p>
          </button>
        </div>
      </div>

      {/* Recent Activity Preview */}
      {accounts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
            <button
              onClick={() => onNavigate('movements')}
              className="text-tropipay-600 hover:text-tropipay-700 font-medium text-sm"
            >
              Ver todo →
            </button>
          </div>
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Haz clic en "Ver todo" para consultar tus movimientos recientes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;