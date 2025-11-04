import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',         // relative Pfade, keine Domain, kein Slash davor!
  build: {
    outDir: 'dist',   // ganz normaler Output-Ordner
  },
})
