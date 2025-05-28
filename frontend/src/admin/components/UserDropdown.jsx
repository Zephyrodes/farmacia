import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../common/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown, FiUser } from 'react-icons/fi'

export default function UserDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative inline-block text-left z-50">
      {/* Avatar + flecha */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-3 py-2 bg-white rounded-full shadow border hover:shadow-lg transition-all focus:outline-none"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-yellow-500 bg-gray-100 shadow">
          <FiUser className="text-yellow-600" size={28} />
        </div>
        <FiChevronDown className="text-gray-500" size={20} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-2xl border border-gray-200 ring-1 ring-black ring-opacity-5 animate-fade-in-down"
          style={{ minWidth: '230px' }}
        >
          <div className="flex flex-col items-center px-6 py-5 bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-t-2xl border-b">
            <div className="w-14 h-14 flex items-center justify-center rounded-full border-4 border-white shadow-md -mt-8 mb-2 bg-gray-100">
              <FiUser className="text-yellow-700" size={38} />
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-wide">
              {user?.username || 'Admin'}
            </span>
            <span className="text-xs font-medium text-gray-600 uppercase tracking-widest bg-white/70 px-3 py-1 rounded-full mt-1 shadow">
              {user?.role || 'Admin'}
            </span>
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="w-full px-5 py-3 text-sm text-red-600 font-bold hover:bg-red-50 hover:text-red-800 rounded-b-2xl transition-colors focus:outline-none focus:bg-red-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

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
