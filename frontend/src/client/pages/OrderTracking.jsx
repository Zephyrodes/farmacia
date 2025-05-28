import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useAuth } from '../../common/context/AuthContext'
import api from '../../common/services/api'

export default function OrderTracking() {
  const { id } = useParams()
  const { token } = useAuth()
  const [tracking, setTracking] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Íconos emoji personalizados
  const originIcon = L.divIcon({
    className: '',
    html: '<span style="font-size: 2rem;">🏢</span>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })

  const destinationIcon = L.divIcon({
    className: '',
    html: '<span style="font-size: 2rem;">🏠</span>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })

  const courierIcon = L.divIcon({
    className: '',
    html: '<span style="font-size: 2rem;">🚴</span>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    let interval = null
    const fetchTracking = async () => {
      try {
        const { data } = await api.get(`/orders/${id}/tracking`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setTracking(data)
        setError('')
      } catch (err) {
        setError(err.response?.data?.detail || 'No se puede cargar el tracking')
      }
    }
    fetchTracking()
    interval = setInterval(fetchTracking, 3000)
    return () => clearInterval(interval)
  }, [id, token, navigate])

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 text-red-600 text-center">
        {error}
        <br />
        <Link to="/profile/orders" className="text-blue-600 underline mt-2 block">
          Volver a mis pedidos
        </Link>
      </div>
    )
  }

  if (!tracking) {
    return (
      <div className="flex justify-center items-center py-24">
        <span className="text-gray-500">Cargando tracking…</span>
      </div>
    )
  }

  const { origin, destination, courier, delivery_status, eta_seconds } = tracking

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Tracking de tu pedido #{id}</h2>
      <p className="mb-2">
        <span className="font-semibold">Estado:</span>{" "}
        <span className={
          delivery_status === "entregado"
            ? "text-green-600 font-semibold"
            : delivery_status === "en camino"
            ? "text-blue-600 font-semibold"
            : "text-yellow-600 font-semibold"
        }>
          {delivery_status.charAt(0).toUpperCase() + delivery_status.slice(1)}
        </span>
      </p>
      {delivery_status === "alistando pedido" && (
        <p className="mb-4 text-yellow-800 font-medium">
          El repartidor está alistando tu pedido… ({eta_seconds}s)
        </p>
      )}
      {delivery_status !== "entregado" && delivery_status !== "alistando pedido" && (
        <p className="mb-4 text-gray-700">
          Tiempo estimado para llegar: <b>{eta_seconds}s</b>
        </p>
      )}
      {delivery_status === "entregado" && (
        <p className="mb-4 text-green-700 font-medium">¡Tu pedido ha sido entregado!</p>
      )}

      <MapContainer
        center={[courier.lat, courier.lng]}
        zoom={14}
        style={{ height: "350px", width: "100%", marginBottom: "1.5rem" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Origen (sucursal) con ícono emoji */}
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
        {/* Destino con ícono emoji */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
        {/* Courier (en movimiento) con ícono emoji */}
        <Marker position={[courier.lat, courier.lng]} icon={courierIcon} />
        {/* Línea de ruta */}
        <Polyline positions={[
          [origin.lat, origin.lng],
          [courier.lat, courier.lng],
          [destination.lat, destination.lng]
        ]} color="blue" />
      </MapContainer>

      <Link to="/profile/orders" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
        Volver a mis pedidos
      </Link>
    </div>
  )
}
