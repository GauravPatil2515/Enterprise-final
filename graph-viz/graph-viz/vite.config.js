import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    strictPort: true,
  },
  define: {
    // Some libraries use `global` which is not available in browser by default in Vite
    global: 'window',
  },
  optimizeDeps: {
    include: ['react-force-graph-2d', 'react-force-graph-3d', 'three'],
  },
})
