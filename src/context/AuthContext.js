import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import backendAPI from '../services/backendApi';
import toast from 'react-hot-toast';

// Tipos de acciones
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_TOKEN: 'SET_TOKEN',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  SET_BENEFICIARIES: 'SET_BENEFICIARIES',
  SET_MOVEMENTS: 'SET_MOVEMENTS',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Estado inicial
const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  userProfile: null,
  token: null,
  accounts: [],
  beneficiaries: [],
  movements: [],
  error: null
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
      
    case ActionTypes.SET_USER:
      return { 
        ...state, 
        user: action.payload,
        isAuthenticated: !!action.payload 
      };
      
    case ActionTypes.SET_TOKEN:
      return { ...state, token: action.payload };
      
    case ActionTypes.SET_ACCOUNTS:
      return { ...state, accounts: action.payload };
      
    case ActionTypes.SET_BENEFICIARIES:
      return { ...state, beneficiaries: action.payload };
      
    case ActionTypes.SET_MOVEMENTS:
      return { ...state, movements: action.payload };
      
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
      
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
      
    case ActionTypes.LOGOUT:
      return { ...initialState };
      
    default:
      return state;
  }
}

// Contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Inicializar - verificar si hay sesión guardada
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    
    try {
      const savedUser = localStorage.getItem('tropipay_user');
      
      if (savedUser) {
        const user = JSON.parse(savedUser);
        
        dispatch({ type: ActionTypes.SET_USER, payload: user });
        
        // Cargar datos iniciales
        await loadInitialData(user.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Login con client credentials
  const login = async (clientId, clientSecret, environment = null) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.CLEAR_ERROR });

    try {
      // Llamar al backend para autenticación
      const result = await backendAPI.login(clientId, clientSecret, environment);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const user = result.data;

      // Guardar en estado y localStorage
      dispatch({ type: ActionTypes.SET_USER, payload: user });
      dispatch({ type: ActionTypes.SET_ACCOUNTS, payload: user.accounts || [] });
      
      localStorage.setItem('tropipay_user', JSON.stringify(user));

      // Cargar datos adicionales
      await loadInitialData(user.id);

      toast.success('Sesión iniciada correctamente');
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Error al iniciar sesión';
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };



  // Refrescar cuentas
  const refreshAccounts = useCallback(async () => {
    if (!state.user?.id) return;
    
    try {
      const result = await backendAPI.getAccounts(state.user.id);
      
      if (result.success) {
        dispatch({ type: ActionTypes.SET_ACCOUNTS, payload: result.data });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      toast.error('Error al cargar las cuentas');
    }
  }, [state.user?.id]);

  // Refrescar beneficiarios
  const refreshBeneficiaries = useCallback(async () => {
    if (!state.user?.id) return;
    
    try {
      const result = await backendAPI.getBeneficiaries(state.user.id);
      
      if (result.success) {
        const beneficiaries = result.data || [];
        dispatch({ type: ActionTypes.SET_BENEFICIARIES, payload: beneficiaries });
        
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error refreshing beneficiaries:', error);
      toast.error('Error al cargar los beneficiarios');
    }
  }, [state.user?.id]);

  // Cargar movimientos de una cuenta
  const loadMovements = async (accountId, params = {}) => {
    if (!state.user?.id) return;
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      const result = await backendAPI.getMovements(
        state.user.id, 
        accountId, 
        params.offset, 
        params.limit
      );
      
      if (result.success) {
        const movements = result.data.data || result.data || [];
        dispatch({ type: ActionTypes.SET_MOVEMENTS, payload: movements });
      } else {
        toast.error('Error al cargar los movimientos');
      }
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Crear beneficiario
  const createBeneficiary = async (beneficiaryData) => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      const result = await backendAPI.addBeneficiary(state.user.id, beneficiaryData);
      
      if (result.success) {
        await refreshBeneficiaries(); // Refrescar lista
        toast.success('Beneficiario creado correctamente');
        return { success: true, data: result.data };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al crear beneficiario';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Simular transferencia
  const simulateTransfer = async (transferData) => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    
    try {
      const result = await backendAPI.simulateTransfer(state.user.id, transferData);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al simular transferencia';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Enviar transferencia
  const sendTransfer = async (transferData) => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      const result = await backendAPI.executeTransfer(state.user.id, transferData);
      
      if (result.success) {
        await refreshAccounts(); // Actualizar balances
        toast.success('Transferencia enviada correctamente');
        return { success: true, data: result.data };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al enviar transferencia';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  // Solicitar código SMS para transferencia
  const requestTransferSMS = useCallback(async (phoneNumber) => {
    if (!state.user?.id) return { success: false, error: 'Usuario no autenticado' };
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      const result = await backendAPI.requestTransferSMS(state.user.id, phoneNumber);
      
      if (result.success) {
        if (result.isDemoMode) {
          toast.success(`Modo demo: usa el código ${result.demoCode}`, { icon: '🧪' });
        } else {
          toast.success('Código SMS enviado a tu teléfono');
        }
        return { success: true, data: result.data, isDemoMode: result.isDemoMode, demoCode: result.demoCode };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al solicitar código SMS';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [state.user?.id]);

  // Cargar datos iniciales
  const loadInitialData = async (userId) => {
    if (!userId) return;
    
    try {
      // Cargar beneficiarios en paralelo
      await Promise.all([
        refreshBeneficiaries()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Logout
  const logout = () => {
    dispatch({ type: ActionTypes.LOGOUT });
    localStorage.removeItem('tropipay_user');
    toast.success('Sesión cerrada');
  };

  const value = {
    ...state,
    login,
    logout,
    refreshAccounts,
    refreshBeneficiaries,
    loadMovements,
    createBeneficiary,
    simulateTransfer,
    sendTransfer,
    requestTransferSMS,
    clearError: () => dispatch({ type: ActionTypes.CLEAR_ERROR })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;