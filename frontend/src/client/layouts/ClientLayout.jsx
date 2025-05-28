// src/client/layouts/ClientLayout.jsx
import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FiShoppingCart, FiHome, FiList, FiUser, FiCircle } from 'react-icons/fi'
import { FaFacebook, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { useAuth } from '../../common/context/AuthContext'
import { useCart } from '../../common/context/CartContext'
import ClientUserDropdown from '../components/ClientUserDropdown'

export default function ClientLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const { cartItems } = useCart()
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  const navLinks = [
    { to: '/', label: 'Inicio', icon: <FiHome size={20} /> },
    { to: '/gamificacion', label: 'Gamificación', icon: <FiList size={20} /> },
    { to: '/catalogo', label: 'Catálogo', icon: <FiList size={20} /> },
    // El carrito va aparte para incluir la burbuja del contador
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header / Navbar */}
      <header className="bg-white shadow">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo + nombre */}
          <Link to="/" className="logo-link flex items-center gap-2 focus:outline-none focus:ring-0 active:outline-none active:ring-0">
            <span className="relative flex items-center justify-center rounded-full bg-green-500 p-2">
              <FiCircle className="text-white" size={22} />
              <span className="absolute w-2 h-2 rounded-full bg-yellow-400 top-2 right-2"></span>
            </span>
            <span className="text-2xl font-bold">
              <span className="text-violet-700">Insta</span>
              <span className="text-green-500">Farma</span>
            </span>
          </Link>

          {/* Navegación */}
          <nav className="flex items-center space-x-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition hover:bg-violet-100 hover:text-violet-700 ${
                  location.pathname === link.to ? 'bg-violet-50 font-semibold text-violet-700' : 'text-gray-700'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Carrito con burbuja de contador */}
            <Link
              to="/carrito"
              className={`relative flex items-center gap-1 px-3 py-2 rounded-lg transition hover:bg-violet-100 hover:text-violet-700 ${
                location.pathname === '/carrito' ? 'bg-violet-50 font-semibold text-violet-700' : 'text-gray-700'
              }`}
            >
              <div className="relative">
                <FiShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Carrito</span>
            </Link>

            {/* Usuario/Login */}
            {user ? (
              <ClientUserDropdown />
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition"
              >
                <FiUser size={20} />
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-violet-700 text-white pt-12 pb-6 mt-12">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          {/* Columna 1: Sobre nosotros */}
          <div>
            <h4 className="font-bold mb-2 text-yellow-300">InstaFarma</h4>
            <p className="mb-4 opacity-90 text-gray-700">
              Tu farmacia online de confianza.<br />
              Enviamos medicamentos y productos de salud a toda Colombia con rapidez y seguridad.
            </p>
            {/* Sellos de confianza SVG */}
            <div className="flex items-center gap-2 mt-2">
              {/* Pago Seguro */}
              <span className="inline-flex flex-col items-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#34D399"/>
                  <path d="M22 14V11a6 6 0 0 0-12 0v3M10 14v7a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-7H10zm6 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs mt-1 text-gray-700 opacity-90">Pago seguro</span>
              </span>
              {/* Farmacia Verificada */}
              <span className="inline-flex flex-col items-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#6366F1"/>
                  <path d="M16 24l-7-7 2-2 5 5 7-7 2 2-9 9z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="text-xs mt-1 text-gray-700 opacity-90">Verificado</span>
              </span>
              {/* Envío Garantizado */}
              <span className="inline-flex flex-col items-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#F59E42"/>
                  <rect x="10" y="15" width="12" height="7" rx="2" stroke="#fff" strokeWidth="2" />
                  <rect x="13" y="12" width="6" height="6" rx="1" stroke="#fff" strokeWidth="2"/>
                  <circle cx="13.5" cy="22.5" r="1.5" fill="#fff"/>
                  <circle cx="18.5" cy="22.5" r="1.5" fill="#fff"/>
                </svg>
                <span className="text-xs mt-1 text-gray-700 opacity-90">Envío garantizado</span>
              </span>
            </div>
          </div>
          {/* Columna 2: Ayuda */}
          <div>
            <h4 className="font-bold mb-2 text-yellow-300">Ayuda</h4>
            <ul className="space-y-2">
              <li><Link to="/faq" className="hover:underline">Preguntas frecuentes</Link></li>
              <li><Link to="/seguimiento" className="hover:underline">Seguimiento de pedido</Link></li>
              <li><Link to="/contacto" className="hover:underline">Contáctanos</Link></li>
              <li><Link to="/soporte" className="hover:underline">Soporte en línea</Link></li>
            </ul>
          </div>
          {/* Columna 3: Legal */}
          <div>
            <h4 className="font-bold mb-2 text-yellow-300">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/terminos" className="hover:underline">Términos y condiciones</Link></li>
              <li><Link to="/privacidad" className="hover:underline">Política de privacidad</Link></li>
              <li><Link to="/politica-datos" className="hover:underline">Tratamiento de datos</Link></li>
              <li><Link to="/devoluciones" className="hover:underline">Devoluciones y reembolsos</Link></li>
            </ul>
          </div>
          {/* Columna 4: Contacto y Redes */}
          <div>
            <h4 className="font-bold mb-2 text-yellow-300">Contacto</h4>
            <ul className="space-y-2 text-gray-700">
              <li>
                <span className="font-semibold">Tel:</span> <a href="tel:018000123456" className="hover:underline">01 8000 123 456</a>
              </li>
              <li>
                <span className="font-semibold">Email:</span> <a href="mailto:soporte@instafarma.com" className="hover:underline">soporte@instafarma.com</a>
              </li>
              <li>
                <span className="font-semibold">Horario:</span> Lun–Sab 8am–8pm
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <FaFacebook className="w-7 h-7 text-[#1877F3]" title="Facebook" />
              <FaInstagram className="w-7 h-7 text-[#E4405F]" title="Instagram" />
              <FaXTwitter className="w-7 h-7 text-black" title="X" />
            </div>
          </div>
        </div>
        {/* Línea divisoria */}
        <div className="border-t border-violet-500 mt-8 pt-6 text-center text-xs opacity-80">
          InstaFarma © {new Date().getFullYear()} — Cuidando tu salud con pasión.
        </div>
      </footer>
    </div>
  )
}
