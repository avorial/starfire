import axios from "axios";

// In Docker: nginx serves the frontend and proxies /ships /combat /health to the backend.
// In dev (npm run dev): vite.config.ts proxy handles it.
// Either way, relative URLs work — no hardcoded host needed.
export const api = axios.create({
  baseURL: "",
});
