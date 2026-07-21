import { handleGenerateContentPackageRequest } from "@/lib/n8n/handleGenerateContentPackageRequest";

// Task 1 — content package generation runs ~160s of AI inline. Request the
// platform's max function budget so a properly-provisioned Vercel deployment
// (Pro/fluid) does not cut it at the lower default. See the sprint report for
// the off-Vercel (worker) migration decision for runs beyond this ceiling.
export const maxDuration = 300;

// n8n-invoked execution endpoint for the Generate Content Package workflow.
// Thin Vercel adapter — auth, settlement, and response mapping live in
// handleGenerateContentPackageRequest so the same shell can later run off-Vercel.
export async function POST(request: Request): Promise<Response> {
  return handleGenerateContentPackageRequest(request);
}
