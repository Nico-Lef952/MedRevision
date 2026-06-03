import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAuthToken, clearAuthToken } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'medrevision_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not auth, object = auth
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Try to get token from localStorage
    const savedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setAuthToken(savedToken);
    }
    
    try {
      const response = await authApi.me();
      setUser(response.data);
    } catch (error) {
      // Clear invalid token
      localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
      clearAuthToken();
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password, rememberMe = false) => {
    const response = await authApi.login({ email, password });
    const userData = response.data;
    
    // Store the token from response
    if (userData.access_token) {
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, userData.access_token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, userData.access_token);
        localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
      }
      setAuthToken(userData.access_token);
    }
    
    // Remove token from user object before storing in state
    const { access_token, ...userWithoutToken } = userData;
    setUser(userWithoutToken);
    return userWithoutToken;
  };

  const register = async (email, password, name) => {
    const response = await authApi.register({ email, password, name });
    const userData = response.data;
    
    // Store the token from response
    if (userData.access_token) {
      localStorage.setItem(TOKEN_KEY, userData.access_token);
      setAuthToken(userData.access_token);
    }
    
    // Remove token from user object before storing in state
    const { access_token, ...userWithoutToken } = userData;
    setUser(userWithoutToken);
    return userWithoutToken;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore logout errors
    }
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    clearAuthToken();
    setUser(false);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
