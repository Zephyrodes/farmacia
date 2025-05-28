// src/admin/pages/Orders.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function Orders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      try {
        const { data } = await api.get('/orders/', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setOrders(data)  // list_orders devuelve todas las órdenes para admin
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar las órdenes')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [token])

  if (loading) return <p className="text-center py-6">Cargando órdenes…</p>
  if (error)   return <p className="text-center py-6 text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Gestión de Órdenes</h1>
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map(order => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.client.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">${order.total.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{order.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
