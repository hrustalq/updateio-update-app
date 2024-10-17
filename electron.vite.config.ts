import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@/services': resolve('src/main/services')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    assetsInclude: 'src/renderer/assets/**',
    server: {
      port: 5175
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/%VITE_API_URL%/g, process.env.VITE_API_URL || '')
        }
      }
    ],
    define: {
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
    }
  }
})
