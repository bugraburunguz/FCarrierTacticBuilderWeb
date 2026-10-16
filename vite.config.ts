/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'

const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: backend, changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Performans testleri ayrı koşar: npm run test:perf (ana npm test yük altında flaky olmasın)
    // scripts/deploy/*.test.mjs node:test + Docker ister; CI'da ayrı adım (node --test).
    exclude: [...configDefaults.exclude, '**/*.perf.test.ts', 'scripts/deploy/**'],
  },
})
