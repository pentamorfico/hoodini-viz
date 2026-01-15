import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import fs from 'node:fs'
import base64Plugin from './vite-plugin-base64'

// Check if template mode is enabled
const isTemplateMode = process.env.VITE_TEMPLATE_MODE === 'true'

// Configuration for building standalone HTML template
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    base64Plugin(), // Enable ?base64 imports
    viteSingleFile(), // Bundle everything into single HTML file
    {
      name: 'inline-favicon',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          const faviconPath = path.resolve(__dirname, 'public/hoodini_logo.svg')
          if (fs.existsSync(faviconPath)) {
            const faviconContent = fs.readFileSync(faviconPath, 'utf-8')
            const faviconBase64 = Buffer.from(faviconContent).toString('base64')
            const dataUri = `data:image/svg+xml;base64,${faviconBase64}`
            return html.replace(
              /<link rel="icon"[^>]*>/g,
              `<link rel="icon" type="image/svg+xml" href="${dataUri}">`
            )
          }
          return html
        }
      }
    },
    {
      name: 'rename-html',
      apply: 'build',
      closeBundle() {
        if (isTemplateMode) {
          const htmlPath = path.resolve(__dirname, 'dist-html/index.html')
          const templatePath = path.resolve(__dirname, 'dist-html/template.html')
          if (fs.existsSync(htmlPath)) {
            fs.renameSync(htmlPath, templatePath)
            console.log('✓ Renamed index.html to template.html')
          }
        }
      }
    }
  ],
  worker: {
    format: 'es'
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ['**/*.gff', '**/*.parquet'],
  build: {
    outDir: 'dist-html',  // Different output directory
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})
