import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // Temporarily disabled to debug build timeout
});

const nextConfig = {
  /* config options here */
  reactCompiler: false, // Temporarily disabled to speed up build
  output: "standalone",
  staticPageGenerationTimeout: 300, // Increase to 5 minutes
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
  eslint: {
    ignoreDuringBuilds: true, // Speeds up build
  },
  typescript: {
    ignoreBuildErrors: false, // We want to catch errors, but already fixed them
  },
  experimental: {
    // reduce memory usage during build
    cpus: 1,
    workerThreads: false,
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
