import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- All-Inkl Variante mit Unterordner /app ---
export default defineConfig({
  plugins: [react()],
  base: '/app/',          // <<< wichtig! sorgt dafür, dass alle Assets korrekt geladen werden
  build: {
    outDir: 'dist',       // CI deployt diesen Ordner nach /ai.ki-smartbiz.de/app/
    emptyOutDir: true,
  },
})
