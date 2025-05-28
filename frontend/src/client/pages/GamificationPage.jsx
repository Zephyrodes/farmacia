// src/client/pages/GamificationPage.jsx
import React from "react";
import UserGamification from "../components/UserGamification";
import MissionsList from "../components/MissionsList";

export default function GamificationPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Mi Gamificación</h1>
      <UserGamification />
      <MissionsList />
    </div>
  );
}
