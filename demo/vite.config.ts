import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const demoRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: demoRoot,
  resolve: {
    alias: {
      'clippy-js': path.resolve(demoRoot, '../src/index.ts')
    }
  },
  server: {
    open: true,
    fs: {
      allow: [
        path.resolve(demoRoot, '..'),
        path.resolve(demoRoot, '../../clippy-swift')
      ]
    }
  },
  build: {
    outDir: path.resolve(demoRoot, '../demo-dist'),
    emptyOutDir: true
  }
})
