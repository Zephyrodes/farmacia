// src/client/components/MissionsList.jsx
import React, { useEffect, useState } from "react";
import { getMyMissions } from "../../common/services/api";

export default function MissionsList() {
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    async function fetchMissions() {
      try {
        const data = await getMyMissions();
        setMissions(data);
      } catch (error) {
        console.error("Error fetching missions:", error);
      }
    }
    fetchMissions();
  }, []);

  if (!missions.length) return <p>No hay misiones activas por ahora.</p>;

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow mt-8">
      <h3 className="text-xl font-semibold mb-4">Misiones de la Semana</h3>
      <ul className="space-y-4">
        {missions.map(({ code, name, description, points_reward, completed }) => (
          <li
            key={code}
            className={`p-4 rounded border ${
              completed ? "bg-green-100 border-green-400" : "bg-red-100 border-red-400"
            }`}
          >
            <h4 className="font-bold">{name} ({points_reward} pts)</h4>
            <p className="mb-2">{description}</p>
            <span className={`font-semibold ${completed ? "text-green-700" : "text-red-700"}`}>
              {completed ? "Completada ✅" : "Pendiente ⏳"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
