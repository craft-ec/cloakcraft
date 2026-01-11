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
        crypto: false,
        child_process: false,
        path: false,
        os: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };

      // Handle pino-pretty (optional dependency)
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': false,
      };
    }

    // Ignore node-specific modules in browser builds
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'child_process': 'commonjs child_process',
        'fs': 'commonjs fs',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
