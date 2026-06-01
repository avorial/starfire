import axios from "axios";

// In dev, Vite proxies /ships, /combat, /health to the FastAPI backend.
// In Docker, set VITE_API_URL to the backend service URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
});
