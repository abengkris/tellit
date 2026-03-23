const nextConfig = {
  /* config options here */
  output: "standalone",
  staticPageGenerationTimeout: 600,
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
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codesandbox/sandpack-client": false,
      "shiki": false,
    };
    return config;
  },
};

export default nextConfig;
