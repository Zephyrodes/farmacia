// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './common/context/AuthContext';
import { CartProvider } from './common/context/CartContext';
import { Elements } from '@stripe/react-stripe-js'; // Importa el proveedor de Stripe
import { loadStripe } from '@stripe/stripe-js'; // Carga la clave pública de Stripe
import './style.css';

// Carga la clave pública de Stripe (reemplázala por tu propia clave pública)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Elements stripe={stripePromise}>  {/* Agrega el provider de Stripe */}
            <App />
          </Elements>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);