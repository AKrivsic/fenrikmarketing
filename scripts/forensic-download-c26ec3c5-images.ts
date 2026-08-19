import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  const { createSupabaseAdminClient } = await import("../lib/supabase/admin");
  const supabase = createSupabaseAdminClient();
  const outDir = resolve("reports/c26ec3c5-artifacts/images");
  mkdirSync(outDir, { recursive: true });
  const jobId = "481814b9-64ad-45f9-90a4-a1041030e15d";
  const projectId = "aabab9ff-9db4-4012-a53c-135e3bfea6cd";
  const bucket = "video-renders";
  for (let n = 1; n <= 5; n++) {
    const path = `${projectId}/video/${jobId}/scene-scene-${n}.png`;
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      console.log("FAIL", path, error.message);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    writeFileSync(resolve(outDir, `scene-${n}.png`), buf);
    console.log("OK", path, buf.length);
  }
  // also srt + thumbnail for forensics (no signed URLs)
  for (const name of ["subtitles.srt", "thumbnail.png"] as const) {
    const path = `${projectId}/video/${jobId}/${name}`;
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      console.log("FAIL", path, error.message);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    writeFileSync(resolve(outDir, name), buf);
    console.log("OK", path, buf.length);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
