import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Netdata Mobile',
        short_name: 'Netdata Mobile',
        description: 'A focused mobile dashboard for your Netdata agent.',
        theme_color: '#0a0d0c',
        background_color: '#0a0d0c',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/api/v1/'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/netdata': {
        target: process.env.NETDATA_URL || 'http://127.0.0.1:19999',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/netdata/, '')
      }
    }
  }
})
