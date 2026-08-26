import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function removeDirectivesPlugin(): Plugin {
  return {
    name: 'remove-directives',
    enforce: 'pre',
    transform(code: string) {
      if (code.includes('use client') || code.includes('use server')) {
        return {
          code: code.replace(/['"]use\s+(client|server)['"];?/g, ''),
          map: null,
        };
      }
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: env.VITE_BASE_URL || '/',
    plugins: [
      removeDirectivesPlugin(),
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 6000000, // 6MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          buildPlugins: {
            vite: [removeDirectivesPlugin()],
          },
        },
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'PowerControl ERP',
          short_name: 'PowerControl',
          description: 'Sistema de Gestão Empresarial e PDV Inteligente',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        onLog(level, log, handler) {
          const code = log?.code;
          const message = typeof log === 'string' ? log : log?.message || '';
          if (
            code === 'MODULE_LEVEL_DIRECTIVE' ||
            message.includes('Module level directives') ||
            message.includes('use client') ||
            message.includes('use server')
          ) {
            return;
          }
          if (typeof handler === 'function') {
            handler(level, log);
          }
        },
        onwarn(warning, defaultHandler) {
          const code = warning?.code;
          const message = typeof warning === 'string' ? warning : warning?.message || '';
          if (
            code === 'MODULE_LEVEL_DIRECTIVE' ||
            message.includes('Module level directives') ||
            message.includes('use client') ||
            message.includes('use server')
          ) {
            return;
          }
          if (typeof defaultHandler === 'function') {
            defaultHandler(warning);
          }
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
