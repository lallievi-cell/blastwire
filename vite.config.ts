import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function pagesEntryPlugin(): Plugin {
  return {
    name: 'blastwire-pages-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/app.html';
        }
        next();
      });
    },
    closeBundle() {
      const appOut = resolve(import.meta.dirname, 'dist/app.html');
      const idxOut = resolve(import.meta.dirname, 'dist/index.html');
      if (existsSync(appOut)) {
        copyFileSync(appOut, idxOut);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [pagesEntryPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      input: resolve(import.meta.dirname, 'app.html'),
    },
  },
});
