import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  CreditCard, 
  Users, 
  Send, 
  Activity, 
  User, 
  Menu, 
  X, 
  LogOut,
  Wallet
} from 'lucide-react';

const Navigation = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'accounts', label: 'Cuentas', icon: CreditCard },
    { id: 'transfer', label: 'Enviar', icon: Send },
    { id: 'beneficiaries', label: 'Beneficiarios', icon: Users },
    { id: 'movements', label: 'Movimientos', icon: Activity },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  const handleNavigate = (page) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white lg:shadow-sm">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="bg-tropipay-500 p-2 rounded-lg">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">TropiPay</span>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-tropipay-100 text-tropipay-900 border-r-2 border-tropipay-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-tropipay-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div>
                <div className="bg-tropipay-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-tropipay-600" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user?.profile?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.client_id}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              {/* Logo */}
              <div className="flex items-center">
                <div className="bg-tropipay-500 p-1.5 rounded-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <span className="ml-2 text-lg font-bold text-gray-900">TropiPay</span>
              </div>

              {/* Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 flex z-40">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                {/* Logo */}
                <div className="flex items-center flex-shrink-0 px-4 mb-8">
                  <div className="bg-tropipay-500 p-2 rounded-lg">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <span className="ml-3 text-xl font-bold text-gray-900">TropiPay</span>
                </div>

                {/* Navigation */}
                <nav className="mt-5 px-2 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-tropipay-100 text-tropipay-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon
                          className={`mr-4 flex-shrink-0 h-5 w-5 ${
                            isActive ? 'text-tropipay-500' : 'text-gray-400'
                          }`}
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* User Section */}
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex items-center w-full">
                  <div>
                    <div className="bg-tropipay-100 p-2 rounded-full">
                      <User className="w-5 h-5 text-tropipay-600" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.profile?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.client_id}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;