import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiUrl = process.env.VITE_API_URL || ''

export default defineConfig({
  plugins: [react()],
  define: {
    __API_URL__: JSON.stringify(apiUrl),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
