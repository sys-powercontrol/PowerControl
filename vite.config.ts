import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';

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
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
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
