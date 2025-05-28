// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RequireRole from './common/RequireRole';

// Layouts
import AdminLayout from './admin/layouts/AdminLayout';
import ClientLayout from './client/layouts/ClientLayout';

// Admin pages
import Dashboard from './admin/pages/Dashboard';
import UserManagement from './admin/pages/UserManagement';
import UserForm from './admin/pages/UserForm'
import Product from './admin/pages/Product';
import ProductDetail from './admin/pages/ProductDetail';
import ProductForm from './admin/pages/ProductForm';
import Orders from './admin/pages/Order';
import OrderDetail from './admin/pages/OrderDetail';
import StockMovements from './admin/pages/StockMovements';
import FinancialMovements from './admin/pages/FinancialMovements';
import PromotionsList from './admin/pages/PromotionsList'
import PromotionForm from './admin/pages/PromotionForm'

// Client pages
import Home from './client/pages/Home';
import Catalog from './client/pages/Catalog';
import CatalogDetail from './client/pages/CatalogDetail';
import Cart from './client/pages/Cart';
import Checkout from './client/pages/Checkout';
import OrderConfirmation from './client/pages/OrderConfirmation';
import OrderProfile from './client/pages/OrderProfile';
import OrderTracking from './client/pages/OrderTracking';
import Login from './client/pages/Login';
import Register from './client/pages/Register';
import DireccionesProfile from './client/pages/DireccionesProfile';
import GamificationPage from './client/pages/GamificationPage';

function App() {
  return (
    <Routes>
      {/* Zona administrativa */}
      <Route
        path="/admin"
        element={
          <RequireRole roles={['admin', 'almacenista']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="usuarios" element={<UserManagement />} />
        <Route path="usuarios/new" element={<UserForm />} />
        <Route path="usuarios/:id" element={<UserForm />} />
        <Route path="inventario" element={<Product />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="stock-movements" element={<StockMovements />} />
        <Route path="financial-movements" element={<FinancialMovements />} />
        <Route path="promotions" element={<PromotionsList />} />
        <Route path="promotions/create" element={<PromotionForm />} />
        <Route path="promotions/:id/edit" element={<PromotionForm />} />
      </Route>

      {/* Zona comercial (clientes y público) */}
      <Route path="/" element={<ClientLayout />}>
        <Route index element={<Home />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="catalogo/:id" element={<CatalogDetail />} />
        <Route path="carrito" element={<Cart />} />
        <Route path="direcciones" element={<DireccionesProfile />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />
        <Route path="orders" element={<OrderProfile />} />
        <Route path="orders/:id" element={<OrderTracking />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="gamificacion" element={<GamificationPage />} />
      </Route>

      {/* Redirige rutas desconocidas a la Home comercial */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
