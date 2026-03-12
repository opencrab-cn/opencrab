/**
 * Vite 配置文件
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  root: '.',
  base: './',  // 使用相对路径
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // 关键：使用绝对路径引用资源
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 禁用 CSS 代码分割，确保 CSS 文件正确生成
    cssCodeSplit: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
