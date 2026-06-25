import assert from "node:assert/strict";
import {
  extractWebsiteImageCandidates,
  rankWebsiteImageCandidates,
} from "@/lib/knowledge/extractWebsiteImageCandidates";

const html = `
<html><head>
<link rel="icon" href="/favicon.ico"/>
<meta property="og:image" content="https://example.com/og.png"/>
</head>
<body>
<img src="/hero.jpg" alt="Hero"/>
<img src="https://evil.com/pixel.gif"/>
</body></html>`;

const candidates = extractWebsiteImageCandidates(html, "https://example.com/");
assert.ok(candidates.some((c) => c.kind === "og_image"));
assert.ok(candidates.some((c) => c.kind === "favicon"));
assert.equal(rankWebsiteImageCandidates(candidates, 2).length, 2);

console.log("ok website image candidates");
