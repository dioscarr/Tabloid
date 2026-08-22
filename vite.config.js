import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        news: resolve(rootDir, 'news.html'),
        city: resolve(rootDir, 'city.html'),
        politics: resolve(rootDir, 'politics.html'),
        culture: resolve(rootDir, 'culture.html'),
        business: resolve(rootDir, 'business.html'),
        sports: resolve(rootDir, 'sports.html'),
        subscribe: resolve(rootDir, 'subscribe.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
})
