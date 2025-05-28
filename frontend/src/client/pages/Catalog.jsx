// src/client/pages/Catalog.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useCart } from '../../common/context/CartContext'
import { useAuth } from '../../common/context/AuthContext'

export default function Catalog() {
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const { addToCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Fetch productos al montar
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data } = await api.get('/products/')
        setProducts(data)
      } catch (err) {
        console.error('Error fetching products:', err)
      }
    }
    fetchProducts()
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = product => {
    if (!user) {
      navigate('/login')
      return
    }
    addToCart({ ...product, quantity: 1 })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Catálogo</h1>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="mt-4 sm:mt-0 border rounded-lg px-4 py-2 w-full sm:w-64"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(product => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
          >
            <img
              src={product.image}
              alt={product.name}
              className="h-40 object-contain mb-4"
            />
            <h2 className="font-semibold text-lg text-gray-800 mb-2">
              {product.name}
            </h2>
            <p className="text-purple-600 text-xl font-bold mb-4">
              ${product.price.toFixed(2)}
            </p>
            <div className="mt-auto flex gap-2">
              <Link
                to={`/catalogo/${product.id}`}
                className="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-medium transition"
              >
                Ver detalle
              </Link>
              <button
                onClick={() => handleAdd(product)}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-2 rounded-lg font-medium transition"
              >
                Añadir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
)
}
