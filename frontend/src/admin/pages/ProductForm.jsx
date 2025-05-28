import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function ProductForm() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  // Estados de producto
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')

  // Imagen: subir nueva o seleccionar existente de S3
  const [imageOption, setImageOption] = useState('upload') // 'upload' | 'existing'
  const [file, setFile] = useState(null)
  const [existingImages, setExistingImages] = useState([])
  const [selectedImage, setSelectedImage] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar datos iniciales: categorías, imágenes S3 y producto (si es edición)
  useEffect(() => {
    async function fetchData() {
      try {
        // Categorías
        const { data: cats } = await api.get('/categories', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setCategories(cats)

        // Imágenes S3
        const { data } = await api.get('/admin/s3-images', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setExistingImages(data.images)

        // Producto (modo edición)
        if (isEdit) {
          const { data: prod } = await api.get(`/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setName(prod.name)
          setPrice(prod.price.toString())
          setStock(prod.stock.toString())
          setCategoryId(prod.category_id ? prod.category_id.toString() : '')
          if (prod.image_filename) {
            setImageOption('existing')
            setSelectedImage(prod.image_filename)
          }
        }
      } catch (err) {
        setError('Error cargando información')
        console.error(err)
      }
    }
    fetchData()
  }, [id, isEdit, token])

  // Lógica de submit (creación o edición)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!categoryId) throw new Error('Selecciona una categoría.')

      let image_filename = ''

      // SUBIR NUEVA imagen a S3 si el usuario seleccionó 'upload'
      if (imageOption === 'upload') {
        if (!file) throw new Error('Selecciona un archivo de imagen.')

        // 1. Pedir presigned url al backend
        const { data: { upload_url } } = await api.get('/upload-url', {
          params: { filename: file.name, content_type: file.type },
          headers: { Authorization: `Bearer ${token}` }
        })

        // 2. Subir a S3 directo usando PUT
        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        })

        image_filename = file.name
      } else if (imageOption === 'existing') {
        if (!selectedImage) throw new Error('Selecciona una imagen existente.')
        image_filename = selectedImage // Aquí guardas solo el key
      }

      // Construir el objeto de producto
      const productData = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category_id: parseInt(categoryId),
        image_filename: image_filename || null
      }

      if (isEdit) {
        await api.put(`/products/${id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await api.post('/products', productData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      navigate('/admin/inventario', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto my-12 bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Editar producto' : 'Agregar producto'}
      </h1>
      {error && (
        <div className="mb-4 text-red-600 text-center">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          >
            <option value="">-- Elige una categoría --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Precio y Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Precio</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
        </div>

        {/* Imagen: Subir o seleccionar existente */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Imagen</label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="imageOption"
                value="upload"
                checked={imageOption === 'upload'}
                onChange={() => setImageOption('upload')}
                className="form-radio"
              />
              <span className="ml-2">Subir desde dispositivo</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="imageOption"
                value="existing"
                checked={imageOption === 'existing'}
                onChange={() => setImageOption('existing')}
                className="form-radio"
              />
              <span className="ml-2">Usar imagen de S3</span>
            </label>
          </div>
          {imageOption === 'upload' ? (
            <input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files[0])}
              className="border rounded px-2 py-1"
            />
          ) : (
            <select
              value={selectedImage}
              onChange={e => setSelectedImage(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">-- Elige una imagen --</option>
              {existingImages.map(img => (
                <option key={img.key} value={img.key}>
                  {img.key.split('/').pop()}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </button>
      </form>
    </div>
  )
}
