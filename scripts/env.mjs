import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const raw = execSync("npx supabase status -o json", { encoding: "utf8" });
const status = JSON.parse(raw.slice(raw.indexOf("{")));
const lines = [
  `SUPABASE_URL=${status.API_URL}`,
  `SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
  `DATABASE_URL=${status.DB_URL}`,
];
writeFileSync(".env.local", lines.join("\n") + "\n");
console.log("wrote .env.local");
