import { useAuth } from '../../common/context/AuthContext';
import { Navigate } from 'react-router-dom';
import React, { useState } from 'react';

export default function Login() {
  const { login, user, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // No renderiza el login si ya está autenticado
  if (loading) return <div>Cargando...</div>;
  if (user) {
    if (user.role === 'admin' || user.role === 'almacenista') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const ok = await login(username, password);
    if (!ok) {
      setLocalError('Error al iniciar sesión');
    }
    // Navegación automática con el cambio de user arriba
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Iniciar sesión</h2>
        {(localError || error) && (
          <div className="mb-4 text-red-600 text-center">{localError || error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
