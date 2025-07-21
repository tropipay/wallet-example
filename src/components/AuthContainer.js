import React, { useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const AuthContainer = () => {
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'register'

  const handleNavigateToRegister = () => {
    setCurrentView('register');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  if (currentView === 'register') {
    return <RegisterPage onBackToLogin={handleBackToLogin} />;
  }

  return <LoginPage onNavigateToRegister={handleNavigateToRegister} />;
};

export default AuthContainer;