import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5174,
      // In dev the app calls /api on its own origin and Vite forwards it to the backend, so no CORS setup is needed.
      proxy: { '/api': { target: env.VITE_PROXY_TARGET || 'https://berly-backend.onrender.com', changeOrigin: true, secure: true } }
    },
    build: { chunkSizeWarningLimit: 1500 }
  }
})
