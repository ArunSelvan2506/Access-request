import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' makes asset URLs relative so the build works from the default
// GitHub Pages project path (…/access-request/) — and from a custom domain
// root too, if one is added later.
export default defineConfig({
  base: './',
  plugins: [react()],
})
