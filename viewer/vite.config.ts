import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
    // Brotli compression (better than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    // Bundle analyzer - enable with ANALYZE=1
    process.env.ANALYZE === '1' && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
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
      '.preview.emergentagent.com',
      '.scanflowai.com',
      'wwww.scanflowai.com'
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
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    chunkSizeWarningLimit: 800,
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core dependencies
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // Material-UI
            if (id.includes('@mui/material')) {
              return 'vendor-mui';
            }
            if (id.includes('@mui/icons-material')) {
              return 'vendor-mui-icons';
            }
            // Redux
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'vendor-redux';
            }
            // Charts
            if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            // DICOM/Medical imaging (lazy load)
            if (id.includes('@cornerstonejs') || id.includes('dicom-parser') || id.includes('cornerstone-wado')) {
              return 'vendor-cornerstone';
            }
            // VTK.js (large library - separate chunk)
            if (id.includes('@kitware/vtk.js')) {
              return 'vendor-vtk';
            }
            // PDF generation
            if (id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            // Utilities
            if (id.includes('date-fns') || id.includes('dayjs')) {
              return 'vendor-date';
            }
            // Fabric.js (for annotations)
            if (id.includes('fabric')) {
              return 'vendor-fabric';
            }
            // Other node_modules
            return 'vendor-misc';
          }
          
          // Application code splitting
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/analytics/') || id.includes('EnhancedAnalyticsPage')) {
            return 'pages-analytics';
          }
          if (id.includes('/pages/viewer/')) {
            return 'pages-viewer';
          }
          if (id.includes('/components/reporting/')) {
            return 'components-reporting';
          }
          if (id.includes('/components/analytics/')) {
            return 'components-analytics';
          }
        },
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
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