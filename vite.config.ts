import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base relativa: el sitio funciona igual en la raíz de un dominio o dentro de /nombre-del-repositorio/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icono.svg', 'qr.png'],
      manifest: {
        name: 'Plataforma de Agua · Laboratorio Valle de Bravo',
        short_name: 'Plataforma de Agua',
        description: 'Datos públicos y preguntas sobre acceso al agua en Valle de Bravo. Prototipo en validación.',
        lang: 'es-MX',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F2F3F4',
        theme_color: '#1A1A1A',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,json,geojson,pdf,txt}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-base',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // La lluvia usa su copia validada en localStorage, con fecha original.
          // Un respaldo HTTP opaco haría pasar datos antiguos por una consulta nueva.
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ['src/**/*.test.ts'] },
})
