import { forwardToApi } from "@/lib/api-proxy";

/** R2 files are served by the API worker (apps/api/src/routes/files.ts). */
export { forwardToApi as GET };
