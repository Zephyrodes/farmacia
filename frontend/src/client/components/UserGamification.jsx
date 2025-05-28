// src/client/components/UserGamification.jsx
import React, { useEffect, useState } from "react";
import { getUserGamification } from "../../common/services/api";

export default function UserGamification() {
  const [gamification, setGamification] = useState(null);

  useEffect(() => {
    async function fetchGamification() {
      try {
        const data = await getUserGamification();
        setGamification(data);
      } catch (error) {
        console.error("Error fetching gamification:", error);
      }
    }
    fetchGamification();
  }, []);

  if (!gamification) return <div>Cargando gamificación...</div>;

  return (
    <div className="bg-white shadow rounded p-6 max-w-md mx-auto text-center">
      <div style={{ fontSize: 64 }}>{gamification.rank_logo}</div>
      <h2 className="text-2xl font-bold">{gamification.rank_name}</h2>
      <p className="text-lg mt-2">Nivel {gamification.level}</p>
      <div className="bg-gray-300 rounded-full h-4 mt-4 overflow-hidden">
        <div
          className="bg-green-500 h-4 transition-all duration-500"
          style={{ width: `${gamification.progress_percent}%` }}
        />
      </div>
      <p className="mt-2">{gamification.points} / 100 puntos para el próximo nivel</p>
    </div>
  );
}
