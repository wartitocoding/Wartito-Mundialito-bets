/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Habilita instrumentation.ts (scheduler interno de sincronización) en Next 14.2
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
