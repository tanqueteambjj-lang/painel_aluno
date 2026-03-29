import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

const rewriteSlashToIndex = () => {
  return {
    name: 'rewrite-slash-to-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/') {
          req.url = '/index.html';
        }
        next();
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), viteSingleFile(), rewriteSlashToIndex()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
});
