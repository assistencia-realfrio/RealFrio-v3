
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Permite que o código continue a usar process.env em vez de import.meta.env
    'process.env': process.env
  }
});
