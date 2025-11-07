import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
// import { visualizer } from 'vite-plugin-bundle-analyzer' // Commented out - package not installed

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - only in analyze mode (commented out - package not installed)
    // process.env.ANALYZE === '1' && visualizer({
    //   open: true,
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/store': resolve(__dirname, './src/store'),
      '@/services': resolve(__dirname, './src/services'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/lib': resolve(__dirname, './src/lib'),
    },
  },
  define: {
    // Define global variables for Cornerstone3D
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@cornerstonejs/core',
      '@cornerstonejs/dicom-image-loader',
      '@cornerstonejs/tools',
      '@cornerstonejs/streaming-image-volume-loader',
      'dicom-parser'
    ]
  },
  server: {
    port: 3010,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      "http://69.62.70.102",
      'dicom-review.preview.emergentagent.com',
      '.emergentagent.com',
      '.preview.emergentagent.com'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('❌ Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔄 Proxying: ${req.method} ${req.url} → ${process.env.VITE_BACKEND_URL || 'http://localhost:8001'}${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            const status = proxyRes.statusCode;
            const icon = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
            console.log(`${icon} Response: ${status} ${req.url}`);
          });
        }
      },
      '/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Separate VTK.js into its own chunk for lazy loading
          vtk: ['@kitware/vtk.js'],
          // Separate reporting components for code splitting
          'reporting-editor': [
            './src/components/reports/UnifiedReportEditor.tsx',
            './src/components/reporting/TemplateSelectorUnified.tsx',
          ],
          cornerstone: [
            '@cornerstonejs/core',
            '@cornerstonejs/tools',
            '@cornerstonejs/dicom-image-loader',
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})