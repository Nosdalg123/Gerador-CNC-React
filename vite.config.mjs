import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
const {viteMapPlugin}=createRequire(import.meta.url)('./scripts/watch-map.cjs');
export default defineConfig({ plugins:[viteMapPlugin()], base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1800 }, server: { port: 5174, strictPort: true } });
