import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api'; // Corrige la ruta si es diferente

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

  // Sincroniza usuario cuando hay token
  useEffect(() => {
    if (token) {
      setLoading(true);
      api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setUser(res.data);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
        setError('Sesión expirada o inválida');
        localStorage.removeItem('token');
        setToken(null);
      });
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  // Login centralizado
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const { data } = await api.post('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      setError(null);
      return true;
    } catch (err) {
      setToken(null);
      setUser(null);
      setError('Credenciales inválidas. Intenta de nuevo.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};
