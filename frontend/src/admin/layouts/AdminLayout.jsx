// src/admin/layouts/AdminLayout.jsx
import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import UserDropdown from '../components/UserDropdown'

export default function AdminLayout() {
  const location = useLocation()
  const navItems = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/usuarios', label: 'Usuarios' },
    { to: '/admin/inventario', label: 'Inventario' },
    { to: '/admin/stock-movements', label: 'Mov. de Stock' },          // Nuevo
    { to: '/admin/financial-movements', label: 'Mov. Financieros' },   // Nuevo
    { to: '/admin/promotions', label: 'Promociones' }, 
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4 text-xl font-semibold">Admin Panel</div>
        <nav className="mt-6">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-4 py-2 my-1 rounded hover:bg-gray-200 ${
                location.pathname === item.to ? 'bg-gray-200 font-medium' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
  
      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center px-6 justify-between">
          <h1 className="text-2xl font-semibold">Administrador</h1>
          <UserDropdown />
        </header>
  
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
