#!/usr/bin/env node
// figma-engine CLI — thin commander wrapper over the deterministic compiler packages.
// PRD §20.1: parse | compile | render | compare | benchmark
// All secrets (FIGMA_TOKEN, DATABASE_URL) are read exactly once here via dotenv and
// never appear in IR, logs, or artifacts (§24). The .env load happens before any import
// that might read process.env at module evaluation time.

import { config } from "dotenv";
config();

import { Command } from "commander";
import { registerParseCommand } from "./cmd-parse.js";
import { registerCompileCommand } from "./cmd-compile.js";
import { registerRenderCommand } from "./cmd-render.js";
import { registerCompareCommand } from "./cmd-compare.js";
import { registerBenchmarkCommand } from "./cmd-benchmark.js";

const program = new Command();

program
  .name("figma-engine")
  .description(
    "Deterministic, browser-verified Figma-to-code reverse-engineering compiler (PRD §20.1)",
  )
  .version("0.0.0");

registerParseCommand(program);
registerCompileCommand(program);
registerRenderCommand(program);
registerCompareCommand(program);
registerBenchmarkCommand(program);

// PRD §20.2: exit-code contract — commander throws on unknown commands/options,
// so unhandled errors become exit 1 by default. Typed failure classes (§21.1/§21.2A)
// set their own exit codes inside each command (2 = API/input error, 3 = schema error,
// 4 = font/asset error, 1 = gate failure).
program.parseAsync(process.argv).catch((err: unknown) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
