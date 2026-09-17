import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

// PRD §14.1: every run produces output under output/<runId>/ with a consistent layout.
// All artifact writes go through this module so the path contract is enforced in one place.

export interface RunManifest {
  runId: string;
  figmaFileKey?: string;
  figmaNodeId?: string;
  generatorVersion: string;
  startedAt: string;
  [key: string]: unknown;
}

export class RunOutput {
  readonly dir: string;

  constructor(
    readonly runId: string,
    outputRoot = "output",
  ) {
    this.dir = join(outputRoot, runId);
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  path(...segments: string[]): string {
    return join(this.dir, ...segments);
  }

  async write(filename: string, content: string | Buffer): Promise<string> {
    const p = this.path(filename);
    await writeFile(p, content);
    return p;
  }

  // Content-addressed hash for any artifact (SHA-256 hex), per §14.8 provenance contract.
  static sha256(content: string | Buffer): string {
    return createHash("sha256").update(content).digest("hex");
  }

  async writeManifest(manifest: RunManifest): Promise<void> {
    await this.write("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  }
}
