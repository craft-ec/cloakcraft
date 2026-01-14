const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cloakcraft/sdk', '@cloakcraft/hooks', '@cloakcraft/ui'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'pino-pretty': false,
        buffer: require.resolve('buffer/'),
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        fs: { browser: './empty.js' },
        net: { browser: './empty.js' },
        tls: { browser: './empty.js' },
        child_process: { browser: './empty.js' },
        'pino-pretty': { browser: './empty.js' },
        buffer: { browser: 'buffer/' },
      },
    },
  },
};

module.exports = nextConfig;
