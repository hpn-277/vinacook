import type { E2EConfig } from "e2e";
import { mobile } from "@e2e-dev/mobile";

/**
 * Deterministic tests (no model) on the Android emulator against the release build that
 * `pnpm android:release` installs. Data comes from `pnpm e2e:seed`, see e2e/seed.ts.
 */
export default {
  tests: "e2e/tests/**/*.e2e.ts",
  targets: [
    {
      name: "android",
      engine: mobile({ platform: "android" }),
      app: { bundleId: "vn.vinacook.staff", appPath: "android/app/build/outputs/apk/release/app-release.apk" },
    },
  ],
  workers: 1,
  // Tests share seeded server state, so a retry would see the first attempt's writes.
  retries: 0,
  actionTimeout: 20_000,
  assertionTimeout: 15_000,
} satisfies E2EConfig;
