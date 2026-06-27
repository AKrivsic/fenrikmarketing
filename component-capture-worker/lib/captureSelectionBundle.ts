import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

let cached: string | null = null;

// Playwright page.evaluate only serializes one function; ship a browser IIFE bundle.
export function getCaptureSelectionBrowserScript(): string {
  if (cached) return cached;
  const dir = dirname(fileURLToPath(import.meta.url));
  const result = esbuild.buildSync({
    entryPoints: [join(dir, "captureBrowserEntry.ts")],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    globalName: "__fenrikCaptureBundle",
    target: "es2020",
  });
  const file = result.outputFiles[0];
  if (!file) throw new Error("capture selection bundle failed");
  cached = file.text;
  return cached;
}
