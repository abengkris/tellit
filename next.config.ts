const nextConfig = {
  /* config options here */
  output: "standalone",
  staticPageGenerationTimeout: 2400, // 40 minutes for static generation
  productionBrowserSourceMaps: false,
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
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Limit concurrency to avoid memory pressure on large build machines
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
      "date-fns",
      "radix-ui",
      "framer-motion",
      "@tanstack/react-virtual",
      "nostr-tools"
    ],
    serverExternalPackages: [
      "@nostr-dev-kit/ndk",
      "@nostr-dev-kit/ndk-cache-dexie",
      "@nostr-dev-kit/messages",
      "@nostr-dev-kit/sessions",
      "@nostr-dev-kit/wallet",
      "@nostr-dev-kit/sync",
      "dexie",
      "ioredis",
      "nostr-tools",
      "@supabase/supabase-js"
    ],
  },
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codesandbox/sandpack-client": false,
      "shiki": false,
    };
    
    // Disable some heavy webpack plugins if needed
    // config.plugins = config.plugins.filter(p => p.constructor.name !== 'SomeHeavyPlugin');

    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    };

    return config;
  },
};

export default nextConfig;
