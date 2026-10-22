import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be opened through an ngrok tunnel (dev only; ignored by `next build`).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.dev"],
  transpilePackages: ["@noodle/core"],
  // The manager's product page used to be "Cài đặt" at /admin/settings.
  async redirects() {
    return [{ source: "/admin/settings", destination: "/admin/products", permanent: true }];
  },
  turbopack: {
    // The pnpm workspace root, so packages/* and the hoisted store resolve.
    root: path.resolve(process.cwd(), "../.."),
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
