const nextConfig = {
  /* config options here */
  output: "standalone",
  staticPageGenerationTimeout: 2400,
  productionBrowserSourceMaps: false,
  cacheComponents: false, // Explicitly disable to resolve conflict with 'force-dynamic'
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
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "dexie",
    "ioredis",
    "nostr-tools",
    "@supabase/supabase-js"
  ],
  experimental: {
    cpus: 4,
    workerThreads: false,
    optimizePackageImports: [
      "lucide-react",
      "@nostr-dev-kit/ndk",
      "@nostr-dev-kit/ndk-cache-dexie",
      "@nostr-dev-kit/messages",
      "@nostr-dev-kit/sessions",
      "@nostr-dev-kit/wallet",
      "@nostr-dev-kit/sync",
      "@nostrify/ndk",
      "@nostrify/nostrify",
      "date-fns",
      "radix-ui",
      "framer-motion",
      "@tanstack/react-virtual"
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codesandbox/sandpack-client": false,
      "shiki": false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    };

    return config;
  },
};

export default nextConfig;
