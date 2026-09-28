import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { officialPagePlugin } from './server/officialPage.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), officialPagePlugin()],
})
