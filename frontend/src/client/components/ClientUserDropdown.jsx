import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../common/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FaUserCircle } from 'react-icons/fa'

export default function ClientUserDropdown({ ordersCount }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block z-50">
      {/* Avatar + nombre */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-gradient-to-tr from-yellow-400 to-violet-500 px-3 py-2 rounded-full shadow-lg border-2 border-violet-500 hover:shadow-xl focus:outline-none transition-all"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Puedes cambiar el icono o usar tu imagen en public/ */}
        <FaUserCircle size={36} className="text-white drop-shadow" />
        <span className="text-white font-semibold text-base truncate max-w-[100px]">{user?.username || "Usuario"}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl border border-violet-200 bg-white/95 backdrop-blur-md animate-fade-in-down">
          <div className="flex flex-col items-center px-6 pt-6 pb-4 rounded-t-2xl bg-gradient-to-br from-yellow-100 via-violet-100 to-white border-b">
            <FaUserCircle size={44} className="text-violet-500 mb-1" />
            <span className="font-bold text-violet-800 text-lg">{user?.username}</span>
          </div>
          <div className="flex flex-col py-1">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/direcciones') 
              }}
              className="w-full text-left px-5 py-3 hover:bg-violet-100 rounded-t-2xl transition-colors font-medium"
            >
              Mis direcciones
            </button>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/orders')
              }}
              className="w-full text-left px-5 py-3 hover:bg-violet-50 transition-colors"
            >
              Mis pedidos
            </button>
            <button
              onClick={() => {
                logout()
                setOpen(false)
                navigate('/login')
              }}
              className="w-full text-left px-5 py-3 text-red-600 font-bold hover:bg-red-50 hover:text-red-700 rounded-b-2xl transition-colors border-t border-violet-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
      {/* Animación fade-in */}
      <style>
        {`
          @keyframes fade-in-down {
            0% { opacity: 0; transform: translateY(-16px);}
            100% { opacity: 1; transform: translateY(0);}
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.22s cubic-bezier(.39,.575,.565,1) both;
          }
        `}
      </style>
    </div>
  )
}
