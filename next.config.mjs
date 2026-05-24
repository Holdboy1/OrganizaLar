import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Export estático (HTML/CSS/JS puros) para servir em qualquer host estático.
  output: "export",

  images: {
    unoptimized: true,
  },

  turbopack: {
    root: __dirname,
  },

  // Trailing slash para hosts como Netlify funcionarem com URLs amigáveis.
  trailingSlash: true,
}

export default nextConfig
