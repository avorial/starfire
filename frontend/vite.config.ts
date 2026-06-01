import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ships': 'http://localhost:8001',
      '/combat': 'http://localhost:8001',
      '/health': 'http://localhost:8001',
    },
  },
})
