// src/admin/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import api from '../../common/services/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    new_orders: 0,
    revenue: 0,
    total_users: 0,
    total_products: 0,
    historical_revenue: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true
    async function fetchStats() {
      try {
        const { data } = await api.get('/admin/summary')
        if (isMounted) {
          setStats({
            new_orders: data.new_orders ?? 0,
            revenue: data.revenue ?? 0,
            total_users: data.total_users ?? 0,
            total_products: data.total_products ?? 0,
            historical_revenue: data.historical_revenue ?? 0,
            loading: false,
            error: null,
          })
        }
      } catch (err) {
        if (isMounted) {
          setStats(s => ({
            ...s,
            loading: false,
            error: 'Error al obtener estadísticas'
          }))
        }
      }
    }
    fetchStats()
    return () => { isMounted = false }
  }, [])

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <span className="text-gray-600 animate-pulse">Cargando estadísticas...</span>
      </div>
    )
  }

  if (stats.error) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <span className="text-red-600">{stats.error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Pedidos nuevos hoy */}
        <div className="bg-white p-6 rounded-lg shadow relative">
          <p className="text-sm font-medium text-gray-500 uppercase flex items-center">
            Pedidos nuevos (hoy)
            <span title="Cantidad de pedidos creados hoy. Incluye todos los estados." className="ml-2 cursor-help text-gray-400">ⓘ</span>
          </p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">{stats.new_orders}</p>
        </div>

        {/* Ingresos hoy (solo pagados) */}
        <div className="bg-white p-6 rounded-lg shadow relative">
          <p className="text-sm font-medium text-gray-500 uppercase flex items-center">
            Ingresos (hoy)
            <span
              title="Suma total de los pedidos pagados hoy. Representa el dinero efectivamente recibido hoy."
              className="ml-2 cursor-help text-gray-400"
            >ⓘ</span>
          </p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            ${typeof stats.revenue === "number" ? stats.revenue.toLocaleString() : "0"}
          </p>
        </div>

        {/* Usuarios totales */}
        <div className="bg-white p-6 rounded-lg shadow relative">
          <p className="text-sm font-medium text-gray-500 uppercase flex items-center">
            Usuarios registrados
            <span
              title="Cantidad total de usuarios registrados en el sistema."
              className="ml-2 cursor-help text-gray-400"
            >ⓘ</span>
          </p>
          <p className="mt-2 text-2xl font-semibold text-orange-700">{stats.total_users}</p>
        </div>

        {/* Productos activos */}
        <div className="bg-white p-6 rounded-lg shadow relative">
          <p className="text-sm font-medium text-gray-500 uppercase flex items-center">
            Productos activos
            <span
              title="Cantidad de productos disponibles en el catálogo."
              className="ml-2 cursor-help text-gray-400"
            >ⓘ</span>
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-800">{stats.total_products}</p>
        </div>

        {/* Ventas históricas (solo pedidos pagados) */}
        <div className="bg-white p-6 rounded-lg shadow relative col-span-full sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-gray-500 uppercase flex items-center">
            Ingresos históricos
            <span
              title="Suma total de todos los pedidos pagados desde el inicio. Representa el total cobrado históricamente."
              className="ml-2 cursor-help text-gray-400"
            >ⓘ</span>
          </p>
          <p className="mt-2 text-2xl font-semibold text-purple-700">
            ${typeof stats.historical_revenue === "number" ? stats.historical_revenue.toLocaleString() : "0"}
          </p>
        </div>

      </div>
    </div>
  )
}
