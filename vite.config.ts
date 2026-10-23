import { defineConfig } from 'vite';

// JSX is compiled by Vite's built-in esbuild (automatic runtime), so no React plugin is needed.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
});
