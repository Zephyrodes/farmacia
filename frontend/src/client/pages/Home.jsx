// src/client/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../common/services/api'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const navigate = useNavigate()

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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-center py-20 px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          Compra fácil, recibe rápido, vive mejor
        </h1>
        <p className="text-xl mb-8">
          Medicamentos, cuidado personal y más… ¡a solo un clic!
        </p>
        <button
          onClick={() => navigate('/catalogo')}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold transition"
        >
          Ver catálogo
        </button>
      </section>

      {/* Buscador y Productos */}
      <section className="container mx-auto px-6 py-10">
        <input
          type="text"
          placeholder="¿Qué buscas hoy?"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-8"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <img
                src={product.image}
                alt={product.name}
                className="h-40 object-contain mb-4"
              />
              <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
              <p className="text-purple-600 text-xl font-bold mt-auto">
                ${product.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-white py-20 px-6 md:px-24 text-center">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">¿Por qué elegirnos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <div>
            <h3 className="font-semibold text-xl mb-2">Envío rápido</h3>
            <p>Recibe tus productos en 24–48 horas.</p>
          </div>
          <div>
            <h3 className="font-semibold text-xl mb-2">Atención personalizada</h3>
            <p>Estamos aquí para ayudarte cuando lo necesites.</p>
          </div>
          <div>
            <h3 className="font-semibold text-xl mb-2">Calidad garantizada</h3>
            <p>Solo trabajamos con marcas de confianza.</p>
          </div>
        </div>
      </section>

      {/* Llamado a la acción */}
      <section className="bg-gradient-to-r from-green-100 to-blue-100 py-20 px-6 md:px-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Descarga nuestra app</h2>
        <p className="mb-8">Lleva tu farmacia donde vayas, sin complicaciones.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="#"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300"
          >
            App Store
          </Link>
          <Link
            to="#"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300"
          >
            Google Play
          </Link>
        </div>
      </section>
    </>
  )
}
