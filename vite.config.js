import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Relative base ('./') so assets resolve no matter what path/case the site is
// served at — the GitHub Pages project URL is /Access-request/ (capitalised to
// match the repo name). Requires Pages "Source" = GitHub Actions so the built
// dist/ is served (not the raw repo via Jekyll).
export default defineConfig({
  base: './',
  plugins: [react()],
})
