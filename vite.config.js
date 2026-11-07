import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // API local (npm run dev:api). Em produção, /api/* é servido pela Vercel.
    proxy: {
      '/api/v2': { target: 'http://127.0.0.1:3001', changeOrigin: false }
    }
  }
})
