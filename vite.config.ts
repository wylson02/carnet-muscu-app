import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sert le site sous /<repo>/, pas à la racine du domaine.
// `GH_PAGES=true npm run build` produit ce build-là ; sinon (Vercel et tout
// autre hébergeur qui sert depuis la racine), rien ne change.
const base = process.env.GH_PAGES === 'true' ? '/carnet-muscu-app/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      workbox: {
        // Tout le bundle est précaché : l'app démarre sans réseau, en avion.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Carnet Système Fluide',
        short_name: 'Carnet',
        description: "Carnet d'entraînement hors-ligne — Système Fluide",
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0E11',
        theme_color: '#0B0E11',
        categories: ['health', 'fitness'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
