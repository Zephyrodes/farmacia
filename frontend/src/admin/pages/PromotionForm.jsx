// src/admin/pages/PromotionForm.jsx
import React, { useState, useEffect } from 'react'
import api from '../../common/services/api'
import { useNavigate, useParams } from 'react-router-dom'

export default function PromotionForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [type, setType] = useState('promocion')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [fixedDiscount, setFixedDiscount] = useState('')
  const [offerQuantity, setOfferQuantity] = useState('')
  const [offerPay, setOfferPay] = useState('')
  const [productId, setProductId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/products/').then(res => setProducts(res.data))
    api.get('/categories/').then(res => setCategories(res.data))
  }, [])

  useEffect(() => {
    if (isEditing) {
      api.get(`/promotions/${id}`)
        .then(res => {
          const promo = res.data
          setType(promo.type)
          setTitle(promo.title)
          setDescription(promo.description || '')
          setDiscountPercent(promo.discount_percent || '')
          setFixedDiscount(promo.fixed_discount || '')
          setOfferQuantity(promo.offer_quantity || '')
          setOfferPay(promo.offer_pay || '')
          setProductId(promo.product_id || '')
          setCategoryId(promo.category_id || '')
          setStartDate(promo.start_date.slice(0, 16))
          setEndDate(promo.end_date.slice(0, 16))
        })
        .catch(() => setMessage('Error cargando promoción'))
    }
  }, [id, isEditing])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        type,
        title,
        description,
        discount_percent: discountPercent ? parseFloat(discountPercent) : null,
        fixed_discount: fixedDiscount ? parseFloat(fixedDiscount) : null,
        offer_quantity: offerQuantity ? parseInt(offerQuantity) : null,
        offer_pay: offerPay ? parseInt(offerPay) : null,
        product_id: productId ? parseInt(productId) : null,
        category_id: categoryId ? parseInt(categoryId) : null,
        start_date: startDate,
        end_date: endDate
      }

      if (isEditing) {
        await api.put(`/promotions/${id}`, payload)
        setMessage('Promoción actualizada correctamente')
      } else {
        await api.post('/promotions/', payload)
        setMessage('Promoción creada correctamente')
        // Opcional: limpiar formulario
        setType('promocion')
        setTitle('')
        setDescription('')
        setDiscountPercent('')
        setFixedDiscount('')
        setOfferQuantity('')
        setOfferPay('')
        setProductId('')
        setCategoryId('')
        setStartDate('')
        setEndDate('')
      }
      setTimeout(() => navigate('/admin/promotions'), 1500)
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Editar Promoción' : 'Crear Nueva Promoción'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <label className="block">
          Tipo:
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          >
            <option value="promocion">Promoción</option>
            <option value="oferta">Oferta</option>
          </select>
        </label>

        <label className="block">
          Título:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>

        <label className="block">
          Descripción:
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </label>

        {type === 'promocion' && (
          <>
            <label className="block">
              % Descuento:
              <input
                type="number"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              Descuento fijo:
              <input
                type="number"
                step="0.01"
                value={fixedDiscount}
                onChange={(e) => setFixedDiscount(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </>
        )}

        {type === 'oferta' && (
          <>
            <label className="block">
              Cantidad para oferta (ej. 2 para 2x1):
              <input
                type="number"
                value={offerQuantity}
                onChange={(e) => setOfferQuantity(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="block">
              Cantidad a pagar (ej. 1 para 2x1):
              <input
                type="number"
                value={offerPay}
                onChange={(e) => setOfferPay(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </>
        )}

        <label className="block">
          Producto:
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Ninguno --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          Categoría:
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Ninguna --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          Fecha inicio:
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>

        <label className="block">
          Fecha fin:
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </label>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {isEditing ? 'Actualizar' : 'Crear'}
        </button>
      </form>
      {message && <p className="mt-4">{message}</p>}
    </div>
  )
}
