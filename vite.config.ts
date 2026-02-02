import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json');
        console.log('✓ Copied manifest.json to dist/');
      },
    },
    {
      name: 'build-iife-scripts',
      async closeBundle() {
        console.log('Building content script and interceptor as IIFE...');

        // Build content script as IIFE
        await build({
          configFile: false,
          define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env': '{}',
            'global': 'globalThis',
          },
          resolve: {
            alias: {
              '@': resolve(__dirname, './src'),
              '@mcp-clients': resolve(__dirname, './mcp-clients'),
            },
          },
          build: {
            outDir: 'dist',
            emptyOutDir: false,
            minify: false,
            lib: {
              entry: resolve(__dirname, 'src/content/index.tsx'),
              name: 'ContentScript',
              formats: ['iife'],
              fileName: () => 'content/index.js',
            },
            rollupOptions: {
              output: {
                extend: true,
                assetFileNames: 'assets/[name].[ext]',
                globals: {
                  react: 'React',
                  'react-dom': 'ReactDOM',
                  'react-dom/client': 'ReactDOM',
                },
              },
            },
          },
        });

        // Build interceptor as IIFE
        await build({
          configFile: false,
          build: {
            outDir: 'dist/content',
            emptyOutDir: false,
            minify: false,
            lib: {
              entry: resolve(__dirname, 'src/content/interceptor.ts'),
              name: 'NetworkInterceptor',
              formats: ['iife'],
              fileName: () => 'interceptor.js',
            },
            rollupOptions: {
              output: {
                extend: true,
              },
            },
          },
        });

        console.log('✓ Built content script and interceptor as IIFE');
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@mcp-clients': resolve(__dirname, './mcp-clients'),
    },
  },
  build: {
    outDir: 'dist',
    minify: false, // Disable minify for easier debugging
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name]/index.js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
