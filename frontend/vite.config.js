import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          
          // Chart.js and dependencies
          'chart': ['chart.js', 'react-chartjs-2'],
          
          // Leaflet map dependencies
          'leaflet': ['leaflet', 'react-leaflet'],
          
          // PDF generation libraries
          'pdf': ['html2canvas', 'jspdf'],
          
          // HTTP and utilities
          'utils': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 kB
    sourcemap: false, // Disable sourcemaps in production for smaller builds
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'chart.js',
      'react-chartjs-2',
      'leaflet',
      'react-leaflet',
      'axios'
    ]
  }
})
