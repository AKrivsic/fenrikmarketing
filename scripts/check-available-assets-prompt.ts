import assert from "node:assert/strict";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  assetRefHasPromptContext,
  formatAvailableAssetPromptLine,
} from "@/lib/assets/formatAvailableAssetLine";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

const base: AssetRef = {
  id: "uuid-1",
  title: "Shot",
  asset_class: "static",
  media_type: "image",
};

check("minimal asset line includes preferred usage hint", () => {
  const line = formatAvailableAssetPromptLine(base);
  assert.ok(line.startsWith('- id=uuid-1 class=static type=image "Shot"'));
  assert.ok(line.includes("Preferred usage:"));
  assert.equal(assetRefHasPromptContext(base), false);
});

check("extended line when role set", () => {
  const line = formatAvailableAssetPromptLine({
    ...base,
    product_role: "logo",
  });
  assert.ok(line.includes("role=logo"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
