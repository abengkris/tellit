const nextConfig = {
  /* config options here */
  output: "standalone",
  staticPageGenerationTimeout: 2400,
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
  // Ensure we don't transpile what we want to keep external
  transpilePackages: [], 
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
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codesandbox/sandpack-client": false,
      "shiki": false,
    };
    
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    };

    return config;
  },
};

export default nextConfig;
