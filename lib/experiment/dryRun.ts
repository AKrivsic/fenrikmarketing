/**
 * Local prompt experiments only — never import from production workflows.
 * DRY_RUN_ONLY blocks all Supabase writes at runtime.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export const DRY_RUN_ONLY = true as const;

export function assertDryRunOnly(): void {
  if (!DRY_RUN_ONLY) {
    throw new Error("DRY_RUN_ONLY must be true for prompt experiments");
  }
}

const WRITE_METHODS = new Set([
  "insert",
  "update",
  "delete",
  "upsert",
  "rpc",
]);

function wrapQueryBuilder<T extends object>(builder: T): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && WRITE_METHODS.has(prop)) {
        return () => {
          throw new Error(
            `DRY_RUN_ONLY: blocked Supabase.${prop}() — prompt experiment is read-only`,
          );
        };
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const result = value.apply(target, args);
          if (result && typeof result === "object") {
            return wrapQueryBuilder(result as object);
          }
          return result;
        };
      }
      return value;
    },
  }) as T;
}

/** Service-role client with insert/update/delete/upsert/rpc hard-blocked. */
export function createReadOnlySupabaseClient(): SupabaseClient {
  assertDryRunOnly();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (load .env.local first)",
    );
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) =>
          wrapQueryBuilder(target.from(table));
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

/** Loads `.env.local` into process.env (does not override existing vars). */
export function loadEnvLocal(cwd: string = process.cwd()): void {
  const path = resolve(cwd, ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}
