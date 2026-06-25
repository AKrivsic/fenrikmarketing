import assert from "node:assert/strict";
import { buildFunnelAssetPolicyBlock } from "@/lib/ai/prompts/funnelAssetPolicy";

const block = buildFunnelAssetPolicyBlock("awareness");
assert.ok(block.includes("FUNNEL ASSET POLICY"));
assert.ok(block.includes("Mostly AI-generated"));
assert.ok(block.includes("empty asset_usage"));

console.log("ok funnel asset policy");
