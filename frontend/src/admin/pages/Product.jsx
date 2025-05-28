// src/admin/pages/Product.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function Products() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        const { data } = await api.get('/products', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setProducts(data)
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar productos')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [token])

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este producto?')) return
    try {
      await api.delete(`/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar producto')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Productos</h1>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Agregar Producto
        </button>
      </div>

      {loading ? (
        <p className="text-center py-6 text-gray-600">Cargando productos…</p>
      ) : error ? (
        <p className="text-center py-6 text-red-600">{error}</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{p.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{p.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {p.category || 'Sin categoría'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-4">
                    <button
                      onClick={() => navigate(`/admin/products/${p.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Ver Detalles
                    </button>
                    <button
                      onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
