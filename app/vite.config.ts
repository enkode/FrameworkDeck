import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so asset paths work when loaded from file:// in packaged Electron
  base: './',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:30912',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Strip Origin/Referer so the service's CORS allowlist doesn't reject
            // dev-server requests (browser sends Origin on all non-GET fetch calls)
            proxyReq.removeHeader('Origin')
            proxyReq.removeHeader('Referer')
          })
        },
      },
    },
  },
})
