import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be opened through an ngrok tunnel (dev only; ignored by `next build`).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.dev"],
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

// Gives `next dev` local emulations of the wrangler.jsonc bindings (R2), persisted in .wrangler/.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
