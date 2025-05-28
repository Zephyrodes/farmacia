// src/client/pages/DireccionesProfile.jsx
import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useAuth } from '../../common/context/AuthContext'
import api from '../../common/services/api'

function LocationSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng)
    }
  })
  return null
}

export default function DireccionesProfile() {
  const { token } = useAuth()
  const [direcciones, setDirecciones] = useState([])
  const [adding, setAdding] = useState(false)
  const [marker, setMarker] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Cargar direcciones al montar y después de agregar
  const loadDirecciones = () => {
    if (!token) return
    api.get('/addresses', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(({ data }) => setDirecciones(data))
      .catch(() => setDirecciones([]))
  }
  useEffect(loadDirecciones, [token, success])

  const handleAdd = async () => {
    if (!marker) {
      setError('Debes seleccionar una ubicación en el mapa')
      return
    }
    try {
      await api.post('/addresses', {
        latitude: marker.lat,
        longitude: marker.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('¡Dirección agregada!')
      setAdding(false)
      setMarker(null)
      setError('')
      loadDirecciones()
    } catch (err) {
      setError('Error guardando dirección')
    }
  }

  // Icono emoji para el marker
  const emojiIcon = L.divIcon({
    className: '',
    html: '<span style="font-size: 2rem;">🏠</span>',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Mis direcciones</h2>
      <ul className="mb-4">
        {direcciones.length === 0 && <li className="text-gray-500">No tienes direcciones guardadas.</li>}
        {direcciones.map(dir => (
          <li key={dir.id} className="mb-2 text-gray-700 flex items-center gap-2">
            Lat: {dir.latitude.toFixed(5)}, Lng: {dir.longitude.toFixed(5)}
            {/* Botón de borrar eliminado */}
          </li>
        ))}
      </ul>
      {adding ? (
        <>
          <p className="mb-2 text-gray-600">Haz clic en el mapa para seleccionar tu ubicación.</p>
          <MapContainer
            center={[4.653, -74.083]}
            zoom={13}
            style={{ height: "300px", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationSelector onSelect={setMarker} />
            {marker && (
              <Marker position={[marker.lat, marker.lng]} icon={emojiIcon} />
            )}
          </MapContainer>
          <div className="mt-4 flex gap-2">
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleAdd}
            >
              Guardar dirección
            </button>
            <button
              className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              onClick={() => { setAdding(false); setMarker(null); setError('') }}
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </>
      ) : (
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => { setAdding(true); setSuccess('') }}
        >
          Añadir dirección
        </button>
      )}
      {success && <p className="text-green-600 mt-4">{success}</p>}
    </div>
  )
}
