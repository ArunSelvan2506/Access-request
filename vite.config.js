import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' makes asset URLs relative so the build works whether it is served
// from a custom domain at the root (accessrequest.fuseenergy.com) or from the
// default GitHub Pages project path (…/access-request/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
