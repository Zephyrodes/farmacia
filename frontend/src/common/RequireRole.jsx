import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Corrige la ruta si es diferente

export default function RequireRole({ roles, children }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Si está cargando, espera
  if (loading) return <div>Cargando...</div>;

  // Si no hay usuario autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si no tiene el rol requerido
  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Autorizado
  return children;
}

RequireRole.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};
