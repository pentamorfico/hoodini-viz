import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from "vite"
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      name: 'inline-favicon',
      transformIndexHtml: (html: string) => {
        try {
          const file = path.resolve(__dirname, 'src/assets/hoodini_logo.svg')
          const svg = fs.readFileSync(file, 'utf-8')
          const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
          return html.replace(
            /<link rel="icon"[^>]*href=["'].*hoodini_logo\.svg["'][^>]*>/,
            `<link rel="icon" type="image/svg+xml" href="${dataUrl}" />`
          )
        } catch (e) {
          return html
        }
      }
    }
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
    // Inline assets so everything ends up in a single HTML file
    assetsInlineLimit: 10_000_000,
    cssCodeSplit: false,
  modulePreload: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Avoid extra files
        inlineDynamicImports: true
      }
    }
  }
})
