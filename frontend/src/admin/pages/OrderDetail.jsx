// src/admin/pages/OrderDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function OrderDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true)
      try {
        const { data } = await api.get(`/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setOrder(data)  // get_order_details devuelve la orden con items y cliente
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar la orden')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id, token])

  async function handleConfirm() {
    try {
      await api.post(
        `/orders/${id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Refresca el estado de la orden
      setLoading(true)
      const { data } = await api.get(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOrder(data)
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo confirmar la orden')
    }
  }

  async function handleCancel() {
    if (!window.confirm('¿Confirmas cancelar esta orden?')) return
    try {
      await api.delete(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/admin/orders', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cancelar la orden')
    }
  }

  if (loading) return <p className="text-center py-6">Cargando orden…</p>
  if (error)   return <p className="text-center py-6 text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orden #{order.id}</h1>
        <div className="space-x-2">
          {order.status === 'pending' && (
            <>
              <button
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Confirmar
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow">
        <div>
          <p><strong>Cliente:</strong> {order.client.username}</p>
          <p><strong>Fecha:</strong> {new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Estado:</strong> {order.status}</p>
          <p><strong>Pago:</strong> {order.payment_status}</p>
          <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Items</h2>
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Producto</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">Cantidad</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Precio</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.product.name}</td>
                  <td className="px-4 py-2 text-center">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">${item.product.price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
