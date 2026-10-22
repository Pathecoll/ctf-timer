import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any folder or bucket prefix.
  base: "./",
  server: { port: 3100 },
})
