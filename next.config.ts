import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Delivery photos go through a server action; the bucket caps them at 5MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
