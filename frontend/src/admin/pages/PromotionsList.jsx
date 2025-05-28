// src/admin/pages/PromotionsList.jsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../common/services/api'

export default function PromotionsList() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const res = await api.get('/promotions/')
      setPromotions(res.data)
      setError(null)
    } catch (err) {
      setError('Error cargando promociones: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar esta promoción?')) return
    try {
      await api.delete(`/promotions/${id}`)
      fetchPromotions()
    } catch {
      alert('Error desactivando la promoción')
    }
  }

  if (loading) return <p>Cargando promociones...</p>
  if (error) return <p>{error}</p>

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Promociones y Ofertas</h2>
      <Link
        to="/admin/promotions/create"
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 inline-block"
      >
        Crear nueva promoción
      </Link>
      {promotions.length === 0 ? (
        <p>No hay promociones activas.</p>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="border px-4 py-2">Tipo</th>
              <th className="border px-4 py-2">Título</th>
              <th className="border px-4 py-2">Producto/Categoría</th>
              <th className="border px-4 py-2">Descuento (%)</th>
              <th className="border px-4 py-2">Oferta (Cantidad/Pagar)</th>
              <th className="border px-4 py-2">Vigencia</th>
              <th className="border px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.id}>
                <td className="border px-4 py-2">{promo.type}</td>
                <td className="border px-4 py-2">{promo.title}</td>
                <td className="border px-4 py-2">
                  {promo.product_id ? `Producto ID: ${promo.product_id}` : promo.category_id ? `Categoría ID: ${promo.category_id}` : '-'}
                </td>
                <td className="border px-4 py-2">{promo.discount_percent ?? '-'}</td>
                <td className="border px-4 py-2">
                  {promo.offer_quantity && promo.offer_pay
                    ? `${promo.offer_quantity} / ${promo.offer_pay}`
                    : '-'}
                </td>
                <td className="border px-4 py-2">
                  {new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}
                </td>
                <td className="border px-4 py-2 space-x-2">
                  <button
                    onClick={() => navigate(`/admin/promotions/${promo.id}/edit`)}
                    className="bg-yellow-400 px-2 py-1 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
