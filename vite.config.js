import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base must match the GitHub Pages project sub-path so asset URLs resolve
// regardless of trailing slash: the site is served at
// https://arunselvan2506.github.io/access-request/ . If a custom domain at the
// root is added later, change this back to '/'.
export default defineConfig({
  base: '/access-request/',
  plugins: [react()],
})
