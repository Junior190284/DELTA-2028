import fs from "node:fs";
import path from "node:path";

// 1. Ładowanie .env.local bez zewnętrznych bibliotek
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

// 2. Walidacja Izolacji Środowiska
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
console.log("=== DELTA 2018 GM — STAGING RUNNER PRE-FLIGHT CHECK ===");
console.log("Target Supabase URL:", supabaseUrl);

if (!supabaseUrl.includes("tdlsxamxtygojxhmjjvp")) {
  console.error("CRITICAL ERROR: Target database is NOT staging tdlsxamxtygojxhmjjvp!");
  process.exit(1);
}
if (supabaseUrl.includes("fctgruvciakhohfxkdzp")) {
  console.error("CRITICAL ERROR: Target database points to PRODUCTION fctgruvciakhohfxkdzp!");
  process.exit(1);
}

import { runStagingE2ESuite } from "./staging-e2e-suite.ts";

async function main() {
  try {
    const { results, summary } = await runStagingE2ESuite();
    console.log("\n========================================================");
    console.log("             STAGING E2E EXECUTION REPORT");
    console.log("========================================================");
    for (const r of results) {
      console.log(`[${r.status}] ${r.name}`);
      console.log(`  > Details: ${r.details}`);
      if (r.error) console.log(`  > Error: ${r.error}`);
    }
    console.log("========================================================");
    console.log(`Summary: Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}`);
    console.log("========================================================");
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("E2E Suite Execution Fatal Error:", err);
    process.exit(1);
  }
}

main();
