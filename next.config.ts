const nextConfig = {
  /* config options here */
  output: "standalone",
  staticPageGenerationTimeout: 1200, // 20 minutes for static generation
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
    // Force standard webpack for production to avoid Turbopack memory/time issues in v16
    turbo: {
      resolveAlias: {
        "@codesandbox/sandpack-client": "react",
        "shiki": "react",
      },
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
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
      "lucide-react"
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
      "nostr-tools"
    ],
  },
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codesandbox/sandpack-client": false,
      "shiki": false,
    };
    
    // Performance optimization for Webpack
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    };

    return config;
  },
};

export default nextConfig;
