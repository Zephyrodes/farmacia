import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'
import ComparePrice from '../components/ComparePrice'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const { token } = useAuth()

  useEffect(() => {
    async function fetchProduct() {
      try {
        // Obtener datos del producto
        const { data } = await api.get(`/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setProduct(data)

        // Si tiene imagen, obtener URL presignada
        if (data.image_filename) {
          const { data: imgRes } = await api.get(
            `/imagen/${data.image_filename}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          setImageUrl(imgRes.image_url)
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar el producto.')
      }
    }
    fetchProduct()
  }, [id, token])

  if (error) {
    return (
      <div className="text-red-600 text-center mt-6">
        {error}
        <br />
        <Link to="/admin/inventario" className="text-blue-600 underline">
          Volver al inventario
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center mt-6">Cargando...</div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow mt-8">
      <h1 className="text-2xl font-semibold mb-4">
        Detalle del Producto #{product.id}
      </h1>
      <div className="mb-4 space-y-2">
        <p>
          <strong>Nombre:</strong> {product.name}
        </p>
        <p>
          <strong>Stock:</strong> {product.stock}
        </p>
        <p>
          <strong>Precio:</strong> {product.price}
        </p>
        <p>
          <strong>Categoría:</strong> {product.category || 'Sin categoría'}
        </p>
      </div>

      {imageUrl && (
        <div className="mb-4">
          <strong>Imagen:</strong>
          <img
            src={imageUrl}
            alt={product.name}
            className="mt-2 w-full max-w-xs rounded"
          />
        </div>
      )}

      {/* --- Sección de comparación de precios --- */}
      <div className="my-6">
        <h2 className="text-lg font-semibold mb-2">Comparar precio con La Rebaja</h2>
        <ComparePrice /> {/* Usa useParams internamente para el id */}
      </div>
      {/* --- Fin de comparación --- */}

      <div className="flex items-center space-x-3">
        <Link
          to="/admin/inventario"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Volver al inventario
        </Link>
      </div>
    </div>
  )
}
