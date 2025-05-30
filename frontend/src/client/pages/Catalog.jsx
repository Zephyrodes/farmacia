import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useCart } from '../../common/context/CartContext'
import { useAuth } from '../../common/context/AuthContext'

export default function Catalog() {
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const { addToCart } = useCart()
  const { user, token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Si no hay token, solo cargar productos sin imagen
    async function fetchProductsWithoutImages() {
      try {
        const { data } = await api.get('/products/')
        // Asignar placeholder en imageUrl
        const prods = data.map(p => ({
          ...p,
          imageUrl: 'https://via.placeholder.com/150?text=Inicia+sesión+para+ver+imagen'
        }))
        setProducts(prods)
      } catch (err) {
        console.error('Error fetching products:', err)
      }
    }

    async function fetchProductsWithImages() {
      try {
        // Mejor enviar token para evitar inconsistencias (aunque backend lo acepte sin token)
        const { data } = await api.get('/products/', {
          headers: { Authorization: `Bearer ${token}` }
        })

        const productsWithImages = await Promise.all(
          data.map(async product => {
            if (product.image_filename) {
              try {
                const res = await api.get(`/imagen/${product.image_filename}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                return { ...product, imageUrl: res.data.image_url }
              } catch (err) {
                console.error('Error fetching image URL for product', product.id, err)
                return { ...product, imageUrl: 'https://via.placeholder.com/150?text=Error+imagen' }
              }
            } else {
              return { ...product, imageUrl: 'https://via.placeholder.com/150?text=Sin+imagen' }
            }
          })
        )
        setProducts(productsWithImages)
      } catch (err) {
        console.error('Error fetching products:', err)
      }
    }

    if (!token) {
      // No token: no mostrar imágenes reales
      fetchProductsWithoutImages()
    } else {
      // Token listo: cargar productos con imágenes reales
      fetchProductsWithImages()
    }
  }, [token])

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
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-40 object-contain mb-4"
              />
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-100 mb-4 text-gray-400">
                Sin imagen
              </div>
            )}
            <h2 className="font-semibold text-lg text-gray-800 mb-2">
              {product.name}
            </h2>
            <p className="text-purple-600 text-xl font-bold mb-4">
              ${product.price.toFixed(2)}
            </p>
            <div className="mt-auto flex gap-2">
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
