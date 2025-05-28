import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../common/context/AuthContext'
import api from '../../common/services/api'

export default function OrderProfile() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    async function fetchOrders() {
      try {
        const { data } = await api.get('/orders', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setOrders(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar tus pedidos')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [token, navigate])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-gray-500">Cargando tus pedidos…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-4 bg-red-50 text-red-700 rounded-lg shadow text-center">
        {error}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-600 text-lg mb-4">No tienes pedidos aún.</p>
        <Link
          to="/"
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto my-12 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Mis Pedidos</h2>
      <ul className="space-y-4">
        {orders.map(order => (
          <li
            key={order.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-lg"
          >
            <div>
              <p>
                <span className="font-semibold"># {order.id}</span> —{' '}
                <span className="text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </p>
              <p>
                Estado de pago:{' '}
                <span
                  className={
                    order.payment_status === 'paid'
                      ? 'text-green-600 font-medium'
                      : order.payment_status === 'unpaid'
                      ? 'text-yellow-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {order.payment_status === 'paid'
                    ? 'Pagado'
                    : order.payment_status === 'unpaid'
                    ? 'Pendiente de pago'
                    : order.payment_status}
                </span>
              </p>
              <p>
                Estado de entrega:{' '}
                <span
                  className={
                    order.delivery_status === 'entregado'
                      ? 'text-green-600 font-medium'
                      : order.delivery_status === 'en camino'
                      ? 'text-blue-600 font-medium'
                      : order.delivery_status === 'alistando pedido'
                      ? 'text-yellow-600 font-medium'
                      : 'text-gray-600 font-medium'
                  }
                >
                  {order.delivery_status
                    ? order.delivery_status.charAt(0).toUpperCase() + order.delivery_status.slice(1)
                    : 'No iniciado'}
                </span>
              </p>
              <p>
                Total:{' '}
                <span className="font-semibold">
                  ${order.total?.toFixed(2) || 0}
                </span>
              </p>
            </div>
            <Link
              to={`/orders/${order.id}`}
              className="mt-3 sm:mt-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Ver tracking
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
