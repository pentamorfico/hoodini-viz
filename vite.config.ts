import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import fs from 'node:fs'
import base64Plugin from './vite-plugin-base64'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    base64Plugin(), // Enable ?base64 imports
  ],
  worker: {
    // Ensure workers build as ES modules (required for code-splitting)
    format: 'es'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Allow Vite to treat these data files as static assets (so ?raw / ?url work)
  assetsInclude: ['**/*.gff', '**/*.parquet'],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'HoodiniViz',
      formats: ['es', 'umd'],
      fileName: (format) => `hoodini-viz.${format === 'es' ? 'js' : 'umd.js'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    outDir: 'dist',
  }
})
