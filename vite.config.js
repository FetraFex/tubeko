import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    // @ffmpeg/ffmpeg spawns its worker with `new URL('./worker.js', import.meta.url)`.
    // Pre-bundling rewrites that path, which leaves the worker 404ing in dev.
    exclude: ['@ffmpeg/ffmpeg'],
  },
})
