// src/admin/pages/StockMovements.jsx
import React, { useState, useEffect } from 'react'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function StockMovements() {
  const { token } = useAuth()
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchMovements() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/stock_movements/', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setMovements(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar los movimientos de stock')
      }
      setLoading(false)
    }
    fetchMovements()
  }, [token])

  if (loading) return <p className="text-center py-6">Cargando movimientos de stock…</p>
  if (error)   return <p className="text-red-600 text-center py-6">{error}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Movimientos de Stock</h1>
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movements.map(mov => {
              const tipo = mov.change > 0 ? "entrada" : mov.change < 0 ? "salida" : "neutral";
              const cantidad = Math.abs(mov.change);
              const fecha = mov.timestamp ? new Date(mov.timestamp).toLocaleString() : "Sin fecha";

              return (
                <tr key={mov.id}>
                  <td className="px-6 py-4">{mov.id}</td>
                  <td className="px-6 py-4">{mov.product_id}</td>
                  <td className="px-6 py-4 capitalize">{tipo}</td>
                  <td className="px-6 py-4">{cantidad}</td>
                  <td className="px-6 py-4">{fecha}</td>
                  <td className="px-6 py-4">{mov.description || "-"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
