/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cloakcraft/sdk', '@cloakcraft/hooks', '@cloakcraft/ui'],
  experimental: {
    turbo: {
      resolveAlias: {
        fs: { browser: './empty.js' },
        net: { browser: './empty.js' },
        tls: { browser: './empty.js' },
        child_process: { browser: './empty.js' },
        'pino-pretty': { browser: './empty.js' },
      },
    },
  },
};

module.exports = nextConfig;
