import { defineConfig } from 'vite';

// `npm run build`         -> dist/ (multi-file, hashed assets)
// `npm run build:single`  -> dist/index.html with everything inlined (handy for sharing one file)
export default defineConfig(async ({ mode }) => {
  const plugins = [];
  if (mode === 'single') {
    const { viteSingleFile } = await import('vite-plugin-singlefile');
    plugins.push(viteSingleFile());
  }
  return {
    base: './',
    // the 3D car model is fetched as a URL (inlined as a data URL in the single-file build)
    assetsInclude: ['**/*.glb'],
    plugins,
    server: { host: true, port: 5173 },
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1200,
    },
  };
});
