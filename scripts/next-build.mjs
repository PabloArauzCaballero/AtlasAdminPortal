import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

process.env.NEXT_TELEMETRY_DISABLED ??= "1";
process.env.NEXT_PRIVATE_BUILD_WORKER ??= "1";
rmSync(path.join(process.cwd(), ".next"), { recursive: true, force: true });
process.argv = [process.argv[0] ?? "node", "next", "build"];

await import("next/dist/bin/next");
