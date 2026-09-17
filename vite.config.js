import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — архив для Яндекс Игр открывается не из корня домена.
  base: './',
  server: {
    // Свой порт, чтобы не конфликтовать с другими проектами на 5173.
    port: 5180,
    strictPort: true,
    host: true, // доступ с телефона в той же Wi‑Fi сети
  },
  test: {
    passWithNoTests: true,
  },
  build: {
    outDir: 'dist',
    // Phaser сам по себе ~1.2 МБ — это нормально для игры.
    chunkSizeWarningLimit: 1500,
  },
});
