// src/client/components/GoToHomeButton.jsx
import React from 'react'
import { Link } from 'react-router-dom'

export default function GoToHomeButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 9.75l9-6.75 9 6.75m-3.75 10.5h-10.5a2.25 2.25 0 01-2.25-2.25V12h15v7.5a2.25 2.25 0 01-2.25 2.25z"
        />
      </svg>
      Inicio
    </Link>
  )
}
