// src/client/pages/Cart.jsx
import React from 'react'
import { useCart } from '../../common/context/CartContext'
import { useNavigate } from 'react-router-dom'
import GoToHomeButton from '../components/GoToHomeButton'

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart()
  const navigate = useNavigate()

  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleProceed = () => {
    // Lleva al formulario de checkout (Checkout.jsx)
    navigate('/checkout')
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-600 text-lg mb-4">Tu carrito está vacío.</p>
        <GoToHomeButton />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 p-4 bg-white shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-violet-700">🛒 Mi Carrito</h2>

      {cartItems.map(item => (
        <div
          key={item.id}
          className="flex justify-between items-center mb-4 border-b pb-2"
        >
          <div>
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-gray-500">
              ${item.price.toFixed(2)} x {item.quantity}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={e => updateQuantity(item.id, e.target.value)}
              className="w-16 border rounded px-2 py-1"
            />
            <button
              onClick={() => removeFromCart(item.id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      <div className="text-right mt-6">
        <p className="text-lg font-semibold mb-4">
          Total: ${total.toFixed(2)}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={clearCart}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Vaciar carrito
          </button>
          <button
            onClick={handleProceed}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded"
          >
            Proceder con la compra
          </button>
        </div>
      </div>
    </div>
  )
}
