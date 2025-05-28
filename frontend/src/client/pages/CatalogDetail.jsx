// src/client/pages/CatalogDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useCart } from '../../common/context/CartContext'
import { useAuth } from '../../common/context/AuthContext'

export default function CatalogDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const { addToCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data } = await api.get(`/products/${id}`)
        setProduct(data)
      } catch (err) {
        console.error('Error fetching product:', err)
      }
    }
    fetchProduct()
  }, [id])

  if (!product) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-gray-600">Cargando producto…</span>
      </div>
    )
  }

  const handleAdd = () => {
    if (!user) {
      navigate('/login')
      return
    }
    addToCart({ ...product, quantity })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center text-gray-600 hover:text-gray-800"
      >
        ← Volver
      </button>

      <div className="flex flex-col md:flex-row gap-8 bg-white rounded-lg shadow p-6">
        <img
          src={product.image}
          alt={product.name}
          className="w-full md:w-1/2 h-80 object-contain"
        />

        <div className="flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">
            {product.name}
          </h1>
          <p className="text-gray-700 mb-6">{product.description}</p>
          <p className="text-2xl font-semibold text-purple-600 mb-6">
            ${product.price.toFixed(2)}
          </p>

          <div className="flex items-center gap-4 mb-6">
            <label htmlFor="quantity" className="font-medium">
              Cantidad:
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1"
            />
          </div>

          <button
            onClick={handleAdd}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold transition"
          >
            Añadir al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
