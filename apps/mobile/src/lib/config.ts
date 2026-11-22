/**
 * Origin of the web app, which forwards /api/* and /files/* to the API worker.
 * Defaults to the host machine's `pnpm dev` as seen from the Android emulator.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";
