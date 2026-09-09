import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// The frontend fetches content from the API at runtime; Markdown/YAML parsing
// happens on the server (see server/), never in the browser bundle. Photos are
// served by the Node server at /photos (committed examples) and /uploads.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // In dev, the Vite server (5173) proxies API + media to the Node server.
    // Run both with `npm run dev:full`. Override the target with API_PROXY if the
    // Node server isn't on :5178.
    proxy: {
      '/api': process.env.API_PROXY || 'http://localhost:5178',
      '/uploads': process.env.API_PROXY || 'http://localhost:5178',
      '/photos': process.env.API_PROXY || 'http://localhost:5178',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
})
