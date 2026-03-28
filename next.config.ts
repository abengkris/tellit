import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

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
      "kysely-codegen": false,
      "kysely-bun-worker": false,
      "@libsql/kysely-libsql": false,
      "tarn": false,
      "tedious": false,
      "@tediousjs/connection-string": false,
      "mysql2": false,
      "pg": false,
      "pg-native": false,
      "pg-query-stream": false,
      "better-sqlite3": false,
      "sqlite3": false,
      "chokidar": false,
      "fs-extra": false,
      "globby": false,
      "jiti": false,
      "@oclif/core": false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        perf_hooks: false,
        assert: false,
        crypto: false,
        events: false,
        os: false,
        url: false,
        util: false,
        stream: false,
        buffer: false,
        process: false,
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

export default withSerwist(nextConfig);
