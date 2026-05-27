/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permet de servir index.html depuis le dossier public
  trailingSlash: false,
  // Désactive les erreurs sur les packages deprecated
  webpack: (config) => {
    config.resolve.fallback = { fs: false }
    return config
  },
}

module.exports = nextConfig
