// In-memory Supabase stub for runSceneEditorRerender workflow tests.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";

export interface MockVideoJobRow {
  id: string;
  project_id: string;
  content_item_id: string | null;
  provider: string;
  status: string;
  input: unknown;
  output: unknown;
}

export interface MockContentItemRow {
  id: string;
  project_id: string;
  package_id: string | null;
  generation_metadata: Json | null;
}

export interface MockStore {
  videoJobs: MockVideoJobRow[];
  contentItems: MockContentItemRow[];
}

type Filter =
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "in"; col: string; vals: unknown[] };

type ResultMode = "many" | "maybeOne" | "one";

class MockQuery implements PromiseLike<{ data: unknown; error: null }> {
  private operation: "select" | "insert" | "update" | "none" = "none";
  private filters: Filter[] = [];
  private insertPayload: Record<string, unknown> | null = null;
  private updatePayload: Record<string, unknown> | null = null;
  private limitN: number | null = null;
  private selectCols: string | null = null;
  private resultMode: ResultMode = "many";
  private readonly store: MockStore;
  private readonly table: string;

  constructor(store: MockStore, table: string) {
    this.store = store;
    this.table = table;
  }

  select(cols: string): this {
    if (this.operation === "insert" || this.operation === "update") {
      this.selectCols = cols;
      return this;
    }
    this.operation = "select";
    this.selectCols = cols;
    return this;
  }

  insert(payload: Record<string, unknown>): this {
    this.operation = "insert";
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.operation = "update";
    this.updatePayload = payload;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push({ kind: "in", col, vals });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  maybeSingle(): this {
    this.resultMode = "maybeOne";
    return this;
  }

  single(): this {
    this.resultMode = "one";
    return this;
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private tableRows(): Array<Record<string, unknown>> {
    if (this.table === "video_jobs") {
      return this.store.videoJobs as unknown as Record<string, unknown>[];
    }
    if (this.table === "content_items") {
      return this.store.contentItems as unknown as Record<string, unknown>[];
    }
    return [];
  }

  private applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.filter((row) =>
      this.filters.every((filter) => {
        if (filter.kind === "eq") return row[filter.col] === filter.val;
        if (filter.kind === "in") {
          return filter.vals.includes(row[filter.col]);
        }
        return true;
      }),
    );
  }

  private project(row: Record<string, unknown>): Record<string, unknown> {
    const cols = this.selectCols ?? "*";
    if (cols === "id") return { id: row.id };
    if (cols.includes("generation_metadata")) {
      return {
        id: row.id,
        package_id: row.package_id,
        generation_metadata: row.generation_metadata,
      };
    }
    if (cols.includes("output")) {
      return {
        id: row.id,
        project_id: row.project_id,
        content_item_id: row.content_item_id,
        provider: row.provider,
        status: row.status,
        input: row.input,
        output: row.output,
      };
    }
    return { ...row };
  }

  private execute(): { data: unknown; error: null } {
    if (this.operation === "insert" && this.insertPayload) {
      const id = crypto.randomUUID();
      const row: Record<string, unknown> = { id, ...this.insertPayload };
      if (this.table === "video_jobs") {
        this.store.videoJobs.push(row as unknown as MockVideoJobRow);
      }
      const projected = this.project(row);
      if (this.resultMode === "one") return { data: projected, error: null };
      if (this.resultMode === "maybeOne") return { data: projected, error: null };
      return { data: [projected], error: null };
    }

    if (this.operation === "update" && this.updatePayload) {
      const matches = this.applyFilters(this.tableRows());
      const updated: Record<string, unknown>[] = [];
      for (const row of matches) {
        Object.assign(row, this.updatePayload);
        updated.push(this.project(row));
      }
      if (this.resultMode === "one") {
        return { data: updated[0] ?? null, error: null };
      }
      if (this.resultMode === "maybeOne") {
        return { data: updated[0] ?? null, error: null };
      }
      return { data: updated, error: null };
    }

    if (this.operation === "select") {
      let matched = this.applyFilters(this.tableRows());
      if (this.limitN !== null) matched = matched.slice(0, this.limitN);
      const projected = matched.map((row) => this.project(row));
      if (this.resultMode === "one") {
        return { data: projected[0] ?? null, error: null };
      }
      if (this.resultMode === "maybeOne") {
        return { data: projected[0] ?? null, error: null };
      }
      return { data: projected, error: null };
    }

    return { data: null, error: null };
  }
}

export function createMockSupabaseClient(store: MockStore): SupabaseClient {
  return {
    from(table: string) {
      return new MockQuery(store, table);
    },
    storage: {
      from() {
        return {
          createSignedUrl: async () => ({
            data: { signedUrl: "https://example.test/signed" },
            error: null,
          }),
        };
      },
    },
  } as unknown as SupabaseClient;
}
