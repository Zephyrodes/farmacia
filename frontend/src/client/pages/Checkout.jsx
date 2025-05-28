import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../common/context/CartContext';
import { useAuth } from '../../common/context/AuthContext';
import api from '../../common/services/api';
import GoToHomeButton from '../components/GoToHomeButton';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

function PaymentForm({ orderId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;
    setProcessing(true);
    setError(null);

    try {
      // 1) Crear PaymentIntent
      const { data: { clientSecret } } = await api.post(
        '/create-payment-intent',
        { order_id: orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2) Confirmar con Stripe
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });
      if (stripeError) throw stripeError;

      // 3) Informar a nuestro back-end que el pago fue exitoso
      await api.post(
        `/orders/${orderId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 4) Callback de éxito: limpia carrito y navega
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error procesando el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-gray-700">Datos de la tarjeta</span>
        <div className="mt-1 p-2 border rounded">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg disabled:opacity-50 transition"
      >
        {processing ? 'Procesando...' : 'Pagar'}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [step, setStep] = useState('shipping');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      api.get('/addresses/', { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => {
          setAddresses(data);
          if (data.length) setSelectedAddress(data[0].id.toString());
        })
        .catch(console.error);
    }
  }, [user, token, navigate]);

  const handleShippingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedAddress) {
      setError('Selecciona una dirección de envío');
      return;
    }
    setLoading(true);
    try {
      const itemsPayload = cartItems.map(({ id, quantity }) => ({
        product_id: id,
        quantity
      }));
      const { data: { order_id } } = await api.post(
        '/orders/',
        { address_id: Number(selectedAddress), items: itemsPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrderId(order_id);
      setStep('payment');
    } catch (err) {
      setError(
        err.response?.data?.detail?.[0]?.msg ||
        err.response?.data?.detail ||
        'Error al procesar tu pedido'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'shipping') {
    return (
      <div className="max-w-xl mx-auto py-8">
        <GoToHomeButton />
        <h1 className="text-2xl font-semibold mb-6">Confirmar envío</h1>
        <form onSubmit={handleShippingSubmit} className="space-y-4">
          <label className="block">
            <span className="text-gray-700">Dirección de envío</span>
            <select
              className="mt-1 block w-full border-gray-300 rounded"
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
            >
              {addresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.address_line || `Lat: ${addr.latitude.toFixed(4)}, Lng: ${addr.longitude.toFixed(4)}`}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg disabled:opacity-50 transition"
          >
            {loading ? 'Creando orden...' : 'Continuar al pago'}
          </button>
        </form>
      </div>
    );
  }

  // Paso de pago
  return (
    <div className="max-w-xl mx-auto py-8">
      <GoToHomeButton />
      <h1 className="text-2xl font-semibold mb-6">Pago</h1>
      <Elements stripe={stripePromise}>
        <PaymentForm
          orderId={orderId}
          onSuccess={() => {
            clearCart();
            // Pasamos el orderId a la pantalla de confirmación:
            navigate('/order-confirmation', { state: { orderId } });
          }}
        />
      </Elements>
    </div>
  );
}
