import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Components
import AuthContainer from './components/AuthContainer';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import AccountsPage from './components/AccountsPage';
import MovementsPage from './components/MovementsPage';
import BeneficiariesPage from './components/BeneficiariesPage';
import AddBeneficiaryPage from './components/AddBeneficiaryPage';
import TransferPage from './components/TransferPage';
import ProfilePage from './components/ProfilePage';
import LoadingSpinner from './components/LoadingSpinner';

// Main App Content
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageProps, setPageProps] = useState({});

  const handleNavigate = (page, props = {}) => {
    setCurrentPage(page);
    setPageProps(props);
  };

  // Show loading spinner during initial auth check
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Show auth container (login/register) if not authenticated
  if (!isAuthenticated) {
    return <AuthContainer />;
  }

  // Render current page
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'accounts':
        return <AccountsPage onNavigate={handleNavigate} />;
      case 'movements':
        return <MovementsPage onNavigate={handleNavigate} {...pageProps} />;
      case 'beneficiaries':
        return <BeneficiariesPage onNavigate={handleNavigate} />;
      case 'add-beneficiary':
        return <AddBeneficiaryPage onNavigate={handleNavigate} {...pageProps} />;
      case 'transfer':
        return <TransferPage onNavigate={handleNavigate} {...pageProps} />;
      case 'profile':
        return <ProfilePage onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;