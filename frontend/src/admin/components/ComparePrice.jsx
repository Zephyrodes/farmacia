// src/admin/components/ComparePrice.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../common/services/api";

export default function ComparePrice() {
  const { id } = useParams();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Devuelve un string con formato de moneda según valor numérico o cadena
  const displayPrice = (val) => {
    if (val == null) return "-";
    if (typeof val === "number") {
      return `$${val.toLocaleString("es-CO")}`;
    }
    return val;
  };

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const res = await api.get(`/products/${id}/scrape-price`);
      const data = res.data;
      if (
        typeof data !== "object" ||
        !data.producto ||
        data.precio_interno == null
      ) {
        throw new Error(`JSON inesperado: ${JSON.stringify(data)}`);
      }
      setComparison(data);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data ||
        err.message ||
        "Error desconocido al obtener la comparación";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchComparison();
  }, [id, fetchComparison]);

  return (
    <div className="my-6">
      <button
        className="mb-2 text-xs text-blue-600 hover:underline disabled:opacity-50"
        onClick={fetchComparison}
        disabled={loading}
      >
        {loading ? "Consultando precio en La Rebaja..." : "Actualizar comparación"}
      </button>

      {error && (
        <p className="text-xs text-red-600 whitespace-pre-wrap">{error}</p>
      )}

      {comparison && (
        <div className="border rounded bg-gray-50 p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Producto:</span>
            <span>{comparison.producto}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Precio interno:</span>
            <span>{displayPrice(comparison.precio_interno)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Precio La Rebaja:</span>
            <span>{displayPrice(comparison.precio_rebaja)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Fuente:</span>
            <a
              href={comparison.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              Ver en La Rebaja
            </a>
          </div>
        </div>
      )}
    </div>
  );
}