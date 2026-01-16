/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cloakcraft/hooks', '@cloakcraft/sdk'],
  webpack: (config, { isServer }) => {
    // Handle node modules that don't work in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      'pino-pretty': false,
    };

    // Suppress warnings from dependencies
    config.ignoreWarnings = [
      // Suppress critical dependency warning from web-worker (used by ffjavascript/circomlibjs)
      {
        module: /web-worker/,
        message: /Critical dependency/,
      },
      // Suppress pino-pretty warning from WalletConnect
      {
        module: /pino/,
        message: /Can't resolve 'pino-pretty'/,
      },
    ];

    // Exclude problematic modules from bundle on client
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': false,
      };
    }

    return config;
  },
  // Enable static export for Vercel
  output: 'standalone',
};

module.exports = nextConfig;
