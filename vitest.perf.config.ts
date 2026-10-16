import { defineConfig } from 'vitest/config'
import base from './vite.config.ts'

// Yalnız performans testleri (ana config bunları dışlar).
export default defineConfig({ ...base, test: { ...base.test, include: ['src/**/*.perf.test.ts'], exclude: ['**/node_modules/**'] } })
