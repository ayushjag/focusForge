import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.FOCUSFORGE_E2E ? ".next-e2e" : ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
