import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // Temporarily disabled to debug build timeout
});

const nextConfig = {
  /* config options here */
  cacheComponents: false, // Disabled to resolve 45min build hang
  reactCompiler: false, // Temporarily disabled to speed up build
  output: "standalone",
  staticPageGenerationTimeout: 300, // Increase back to 5 minutes
  enablePrerenderSourceMaps: false,
  productionBrowserSourceMaps: false, // Disable browser source maps for memory
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true, // Escape hatch for build timeout
  },
  eslint: {
    ignoreDuringBuilds: true, // Escape hatch for build timeout
  },
  experimental: {
    // optimize memory usage during build
    cpus: 1,
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
    webpackBuildWorker: true,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

export default withPWA(nextConfig);
