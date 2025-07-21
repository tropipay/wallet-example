import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  CreditCard,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import backendAPI from '../services/backendApi';

const MovementsPage = ({ accountId, account, onNavigate }) => {
  const { accounts, loadMovements, movements, isLoading } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [selectedAccount, setSelectedAccount] = useState(account || null);
  const [dateFilter, setDateFilter] = useState('30'); // Last 30 days
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Si no se proporciona cuenta específica, usar la primera disponible
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
      setSelectedAccountId(defaultAccount.id);
      setSelectedAccount(defaultAccount);
    }
  }, [accounts, selectedAccountId]);

  // Cargar movimientos cuando cambie la cuenta seleccionada
  useEffect(() => {
    if (selectedAccountId) {
      handleLoadMovements();
    }
  }, [selectedAccountId, dateFilter]);

  const handleLoadMovements = async () => {
    if (!selectedAccountId) return;
    
    const params = {
      accountId: selectedAccountId,
      limit: 50,
      offset: 0
    };

    // Agregar filtro de fechas
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      params.fromDate = fromDate.toISOString().split('T')[0];
    }

    await loadMovements(selectedAccountId, params);
  };

  const handleAccountChange = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    setSelectedAccountId(accountId);
    setSelectedAccount(account);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await handleLoadMovements();
    setRefreshing(false);
  };

  // Filtrar movimientos
  const filteredMovements = movements.filter(movement => {
    const matchesSearch = searchTerm === '' || 
      movement.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.concept?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'income' && movement.amount > 0) ||
      (typeFilter === 'expense' && movement.amount < 0);

    return matchesSearch && matchesType;
  });

  const formatMovementType = (movement) => {
    if (movement.amount > 0) {
      return { type: 'income', label: 'Ingreso', icon: ArrowDownLeft, color: 'text-green-600' };
    } else {
      return { type: 'expense', label: 'Egreso', icon: ArrowUpRight, color: 'text-red-600' };
    }
  };

  const formatMovementStatus = (status) => {
    const statusMap = {
      'completed': { label: 'Completado', color: 'bg-green-100 text-green-800' },
      'pending': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      'failed': { label: 'Fallido', color: 'bg-red-100 text-red-800' },
      'processing': { label: 'Procesando', color: 'bg-blue-100 text-blue-800' }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Movimientos
          </h1>
          <p className="text-gray-600">
            Historial de transacciones de tus cuentas
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuenta
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
            >
              <option value="">Todas las cuentas</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.alias || `Cuenta ${account.currency}`} ({account.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 3 meses</option>
              <option value="365">Último año</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Egresos</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tropipay-500 focus:border-transparent"
                placeholder="Referencia, concepto..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      {selectedAccount && (
        <div className="card p-6 mb-8 bg-gradient-to-r from-tropipay-500 to-tropipay-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">
                {selectedAccount.alias || `Cuenta ${selectedAccount.currency}`}
              </h3>
              <p className="text-2xl font-bold">
                {backendAPI.formatAmount(selectedAccount.balance || selectedAccount.available || 0, selectedAccount.currency)}
              </p>
              <p className="opacity-75 text-sm">Balance disponible</p>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <CreditCard className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movements List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Transacciones Recientes
            </h2>
            <span className="text-sm text-gray-500">
              {filteredMovements.length} transacciones
            </span>
          </div>
        </div>

        {isLoading && movements.length === 0 ? (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredMovements.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredMovements.map((movement, index) => {
              const movementInfo = formatMovementType(movement);
              const statusInfo = formatMovementStatus(movement.status || 'completed');
              const MovementIcon = movementInfo.icon;
              
              return (
                <div key={movement.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${
                      movementInfo.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <MovementIcon className={`w-5 h-5 ${movementInfo.color}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {movement.concept || movement.description || 'Transferencia'}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {movement.reference && (
                          <span className="font-mono">#{movement.reference}</span>
                        )}
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {backendAPI.formatDate(movement.created_at || movement.bookingDate || new Date())}
                        </span>
                        {movement.paymentMethod && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {movement.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-bold text-lg ${movementInfo.color}`}>
                        {movement.amount > 0 ? '+' : ''}
                        {backendAPI.formatAmount(Math.abs(movement.amount), movement.currency || selectedAccount?.currency || 'USD')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {movement.currency || selectedAccount?.currency || 'USD'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(movement.beneficiary || movement.account_info) && (
                    <div className="mt-3 ml-14 text-sm text-gray-600">
                      {movement.beneficiary && (
                        <p>Para: {movement.beneficiary.name || movement.beneficiary.firstName} {movement.beneficiary.lastName}</p>
                      )}
                      {movement.account_info && (
                        <p>Cuenta: {movement.account_info.accountNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || typeFilter !== 'all' ? 'No se encontraron transacciones' : 'No hay movimientos'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || typeFilter !== 'all' 
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Aún no has realizado transacciones en esta cuenta'
              }
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <button
                onClick={() => onNavigate('transfer')}
                className="btn-primary"
              >
                Realizar Primera Transferencia
              </button>
            )}
          </div>
        )}

        {/* Load More */}
        {filteredMovements.length > 0 && filteredMovements.length % 50 === 0 && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={() => {
                // Implementar carga de más resultados
                console.log('Load more movements');
              }}
              className="btn-secondary"
            >
              Cargar Más Transacciones
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementsPage;