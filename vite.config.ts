import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          utils: ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
          router: ['react-router-dom'],
          state: ['zustand', 'react-query'],
          ui: ['lucide-react']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'axios', 
      'chart.js', 
      'react-chartjs-2',
      'recharts',
      'date-fns',
      'zustand',
      'react-query',
      'react-router-dom'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9876',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    hmr: {
      overlay: true
    }
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true
  }
})
