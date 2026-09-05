#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";

// Command surface fixed by PRD §20.1. Each command is a stub until its
// owning milestone lands real logic (see docs/planning.md for the milestone
// map). Stubs must not silently "succeed" - they report NOT_IMPLEMENTED.

const program = new Command();

program
  .name("figma-engine")
  .description("Deterministic, browser-verified Figma-to-code reverse-engineering compiler");

function stub(command: string, milestone: string) {
  return () => {
    console.error(`[figma-engine] '${command}' is not implemented yet (lands in ${milestone}).`);
    process.exitCode = 1;
  };
}

program
  .command("parse")
  .description("Parse a Figma frame into NodeIR")
  .requiredOption("--input <manifest>", "path to input manifest JSON")
  .action(stub("parse", "M1"));

program
  .command("compile")
  .description("Compile NodeIR into deterministic HTML/CSS")
  .requiredOption("--input <manifest>", "path to input manifest JSON")
  .action(stub("compile", "M2"));

program
  .command("render")
  .description("Render compiled output in Chromium under the readiness gate")
  .requiredOption("--run <runId>", "run identifier")
  .action(stub("render", "M2"));

program
  .command("compare")
  .description("Compare rendered output against the reference artifact")
  .requiredOption("--run <runId>", "run identifier")
  .action(stub("compare", "M3"));

program
  .command("optimize")
  .description("Run the deterministic patch/candidate-search optimizer")
  .requiredOption("--run <runId>", "run identifier")
  .action(stub("optimize", "M5"));

program
  .command("benchmark")
  .description("Run a benchmark suite and its phase gate")
  .requiredOption("--suite <phase>", "phase1 | phase2 | phase3 | phase4")
  .option("--gate", "exit non-zero unless the phase gate passes", false)
  .action(stub("benchmark", "M0 (fixtures) / M5-M9 (gates)"));

program
  .command("report")
  .description("Produce a report for a run")
  .requiredOption("--run <runId>", "run identifier")
  .action(stub("report", "M3"));

program.parseAsync(process.argv);
