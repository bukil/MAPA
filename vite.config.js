import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base to your repo name for GitHub Project Pages: https://<user>.github.io/<repo>/
  // If you use a custom domain or a user/organization page, change this to '/'
  base: '/MAPA/',
})
