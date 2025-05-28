import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../common/services/api'
import { useAuth } from '../../common/context/AuthContext'

export default function UserForm() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'cliente',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(isEdit)

  // Carga usuario si es edición
  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      api.get(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ data }) => {
        setForm({
          username: data.username,
          password: '', // Por seguridad nunca muestra el password
          role: data.role,
        })
      }).catch(err => {
        setError('No se pudo cargar el usuario')
      }).finally(() => setLoading(false))
    }
  }, [isEdit, id, token])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (isEdit) {
        await api.put(`/users/${id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Usuario editado exitosamente')
      } else {
        await api.post('/register', form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Usuario creado exitosamente')
      }
      setTimeout(() => navigate('/admin/usuarios'), 1200)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar usuario')
    }
  }

  if (loading) {
    return <div className="text-center mt-10">Cargando...</div>
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
      </h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {success && <div className="text-green-600 mb-4">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-gray-600 mb-1">Usuario</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
            autoComplete="off"
            disabled={isEdit} // Para evitar cambiar el username
          />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">
            Contraseña {isEdit ? "(deja en blanco para no cambiar)" : ""}
          </label>
          <input
            name="password"
            value={form.password}
            onChange={handleChange}
            type="password"
            className="w-full border px-3 py-2 rounded"
            autoComplete="new-password"
            required={!isEdit}
            placeholder={isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
          />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Rol</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="cliente">Cliente</option>
            <option value="almacenista">Almacenista</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
        >
          {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
        </button>
        <button
          type="button"
          className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded"
          onClick={() => navigate('/admin/usuarios')}
        >
          Cancelar
        </button>
      </form>
    </div>
  )
}
