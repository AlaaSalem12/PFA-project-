import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: { port: 4200 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            /node_modules[/](react|react-dom|react-router|react-router-dom|scheduler)[/]/.test(id)
          )
            return 'vendor-react';
          if (/node_modules[/]@tanstack[/]/.test(id)) return 'vendor-query';
          return undefined;
        },
      },
    },
  },
});
