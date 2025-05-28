// src/common/services/api.js
import axios from 'axios';

// URL base de tu backend FastAPI en desarrollo local
const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor para inyectar token si existe
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// Obtiene la URL prefirmada para subir un archivo a S3
export const getUploadUrl = async (filename, contentType) => {
  const res = await api.get(
    `/upload-url?filename=${filename}&content_type=${encodeURIComponent(contentType)}`
  );
  return res.data.upload_url;
};

// Obtiene la URL para descargar la imagen
export const getImageUrl = async (filename) => {
  const res = await api.get(`/imagen/${filename}`);
  return res.data.image_url;
};

export async function getUserGamification() {
  const token = localStorage.getItem("token");
  const response = await api.get("/users/me/gamification", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getMyMissions() {
  const token = localStorage.getItem("token");
  const response = await api.get("/users/me/missions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export default api;
