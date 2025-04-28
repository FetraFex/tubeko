import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Required for React
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()], // Enable React support
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});