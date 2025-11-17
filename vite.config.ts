import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI component libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-alert-dialog',
          ],
          // Data fetching and state
          'query-vendor': ['@tanstack/react-query'],
          // Supabase client
          'supabase-vendor': ['@supabase/supabase-js'],
          // Form handling
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
          // Charts (if used)
          'charts-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for now
    sourcemap: false, // Disable sourcemaps for production to reduce size
  },
}));
