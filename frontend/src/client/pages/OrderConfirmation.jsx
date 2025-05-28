// src/client/pages/OrderConfirmation.jsx
import React from 'react'
import { useLocation, Link } from 'react-router-dom'

export default function OrderConfirmation() {
  const { state } = useLocation()
  const orderId = state?.orderId

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow text-center">
      <h1 className="text-3xl font-bold mb-4">¡Compra exitosa!</h1>
      {orderId ? (
        <p className="text-lg mb-6">
          Tu orden <span className="font-semibold">#{orderId}</span> se
          procesó correctamente.
        </p>
      ) : (
        <p className="text-lg mb-6">¡Gracias por tu compra!</p>
      )}
      <Link
        to="/"
        className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium transition"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
