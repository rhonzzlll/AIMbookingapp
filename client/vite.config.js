import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'all',
      '2985-119-92-176-131.ngrok-free.app'
    ]
  }
});
