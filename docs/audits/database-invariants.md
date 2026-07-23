# Production Runtime Audit — Phase 6B: Database Invariants

**Date:** 2026-07-23  
**Scope:** Read-only audit of Postgres migrations, constraints, indexes, triggers, and RPCs that back the AI Content Manager production runtime.  
**Method:** Repo migrations `001`–`025` + live remote schema probes (`pg_constraint`, `pg_indexes`, `information_schema.triggers`, `pg_proc`) + violation-count SQL.  
**Constraint:** No application code, migrations, or schema were modified.

## Verdict (summary)

| Bucket | Count (named invariants) |
|--------|--------------------------|
| **Guaranteed** | 10 |
| **Application only** | 7 |
| **Not guaranteed** | 8 |
| **Unknown** | 4 |

DB ownership is strong for **package identity**, **translation queue identity**, **run-item slot identity**, and **narrow cancel-revive**. It is weak for **run↔item settlement**, **one active render**, **lease completeness**, and **orphan prevention**. Live data already shows terminal runs with open items.

---

## Sources inventory

### Migrations touching production integrity

| Migration | Objects |
|-----------|---------|
| `002_core_tables.sql` | `content_packages`, `content_items` (+ FKs) |
| `003_ai_video_planner_history_performance.sql` | `video_jobs`, `content_versions` unique |
| `007_updated_at_triggers.sql` | `set_updated_at()` |
| `013_content_package_idempotence.sql` | partial unique `uniq_content_packages_strategy_item` |
| `014_video_jobs_updated_at.sql` | `video_jobs.updated_at` + trigger |
| `015_production_runs.sql` | runs/items + status CHECKs + FKs |
| `017_translation_jobs.sql` | table + unique `(source, language)` |
| `021_variant_video_slot.sql` | `claim_variant_video_slot`, `insert_variant_video_job_if_slot_available` |
| `022_production_run_cancelled.sql` | run status CHECK adds `cancelled` |
| `023_prevent_cancelled_video_job_revive.sql` | BEFORE UPDATE trigger |
| `024_production_run_item_identity.sql` | `package_index` unique + strategy partial unique |
| `025_production_runtime.sql` | claims table + package/video lease RPCs |

Remote `list_migrations` naming differs for some historical files (`content_package_service`, `variant_video_slot`, …), but live objects for `013`–`025` (including `translation_jobs`, trigger `023`, claims, leases) are present.

### Live constraints / uniques (production tables)

| Table | Enforced |
|-------|----------|
| `content_packages` | PK; FK project/strategy; **partial unique** `strategy_item_id WHERE NOT NULL` |
| `content_package_generation_claims` | **PK `strategy_item_id`**; status CHECK; FK strategy/project |
| `content_items` | PK; FK package **ON DELETE CASCADE**, project |
| `video_jobs` | PK; FK item **ON DELETE SET NULL**, project; **no uniqueness on item/package** |
| `production_runs` | PK; status CHECK (`queued|running|completed|failed|cancelled`) |
| `production_run_items` | PK; status/content_type CHECKs; **UNIQUE (run, package_index)**; **partial unique (run, strategy_item_id)** |
| `translation_jobs` | PK; status CHECK; **UNIQUE (source_content_item_id, language)**; FK package/item **CASCADE** |
| `content_versions` | **UNIQUE (content_item_id, version_no)** |

### Live triggers (integrity-relevant)

| Trigger | Table | Role |
|---------|-------|------|
| `*_set_updated_at` | packages, items, runs, run items, translation, claims, video | timestamp only |
| `trg_prevent_operator_cancel_video_job_revive` | `video_jobs` | blocks `failed(Zastaveno…)` → `completed` |

### Live RPCs (integrity-relevant)

| RPC | Enforces |
|-----|----------|
| `claim_package_generation` | advisory xact lock + existing-package short-circuit + live-lease busy |
| `renew/release_package_generation_claim` | owner-token CAS on `generating` |
| `claim_video_job_for_dispatch` | `FOR UPDATE`; terminal/artifacts_ready/busy; sets lease |
| `renew_video_job_lease` | owner + `processing` |
| `persist_video_job_artifacts` | merge output while `processing` |
| `promote_video_job_if_artifacts_ready` | `processing` → `completed` if `mp4_url` |
| `claim_variant_video_slot` / `insert_variant_video_job_if_slot_available` | advisory lock; blocks duplicate active variant jobs **when used** |

**Gap:** table writes are not restricted to these RPCs. `service_role` can UPDATE/INSERT around them.

---

## Classification key

| Label | Meaning |
|-------|---------|
| **Guaranteed** | Any writer through SQL hits a constraint, unique index, FK, or trigger that upholds the invariant |
| **Application only** | App and/or RPC uphold it on the intended path; DB still accepts violating rows |
| **Not guaranteed** | Neither DB nor app reliably upholds it (or live violations exist) |
| **Unknown** | Definition ambiguous, intentional exceptions, or insufficient evidence |

---

## Guaranteed

### G1 — No duplicate strategy package (non-null `strategy_item_id`)

- **Mechanism:** `uniq_content_packages_strategy_item` (`013`)
- **Verify:** Live unique index present; probe `duplicate_strategy_packages = 0`
- **Note:** Multiple rows with `strategy_item_id IS NULL` are allowed (detached packages after duplicate cleanup).

### G2 — At most one generation-claim row per strategy item

- **Mechanism:** `content_package_generation_claims.strategy_item_id` PRIMARY KEY (`025`)
- **Verify:** PK present live

### G3 — Claim status domain

- **Mechanism:** `CHECK (status IN ('generating','completed','failed','released'))` (`025`)

### G4 — Unique translation queue unit

- **Mechanism:** `uq_translation_jobs_source_language` (`017`)
- **Verify:** Live unique index present

### G5 — Unique run slot identity

- **Mechanism:** `UNIQUE (production_run_id, package_index)` (`024`)

### G6 — Unique strategy binding per run (when set)

- **Mechanism:** partial unique `(production_run_id, strategy_item_id) WHERE strategy_item_id IS NOT NULL` (`024`)

### G7 — Operator-cancelled video cannot be revived to `completed`

- **Mechanism:** trigger `023` + matching app guards
- **Scope:** Only when `error_message = 'Zastaveno operátorem.'`. Does **not** encode run-cancelled alone, nor block `failed` → `processing`/`queued`.

### G8 — Hard FK orphans for translations

- **Mechanism:** `translation_jobs.package_id` / `source_content_item_id` → `ON DELETE CASCADE`
- **Meaning:** Deleting package or source item deletes queue rows (no dangling translation FKs).

### G9 — Cascade children of packages

- **Mechanism:** `content_items.package_id` → `ON DELETE CASCADE`
- **Meaning:** Deleting a package deletes its items (and cascaded translation units).

### G10 — Status domains for runs / run items / translation jobs

- **Mechanism:** CHECK constraints (`015`, `017`, `022`)
- **Meaning:** Illegal status *strings* rejected; transition graphs are **not** encoded.

---

## Application only

### A1 — Exactly one *live* expensive package generation per strategy item

- **Intended:** `claim_package_generation` advisory lock + busy-while-lease (`025`, `lib/production-runtime/packageGenerationClaim.ts`)
- **DB alone:** PK prevents two claim *rows*, but does not stop `service_role` from rewriting `owner_token` / ignoring lease, or from running CE without calling the RPC.
- **Verdict:** **Application only** (RPC-path strong; table open).

### A2 — Exactly one active render per package (primary / regenerate)

- **Intended:** `assertNoActivePackageRender` (`lib/production-runtime/activeRenderGuard.ts`) before regen AI / new `video_jobs`
- **DB alone:** No partial unique on active jobs per package / item. Multiple `queued|processing` rows are legal.
- **Live:** `packages_multi_active_primary_render = 0` (snapshot clean; not enforced).

### A3 — At most one active variant video per package × language

- **Intended:** `insert_variant_video_job_if_slot_available` (`021`)
- **DB alone:** Direct `INSERT INTO video_jobs` bypasses the advisory lock. No unique index.

### A4 — One active production run per project

- **Intended:** `getActiveProductionRun` gates GENERATE (`lib/api/production-run-admin.ts`)
- **DB alone:** No partial unique on `production_runs (project_id) WHERE status IN ('queued','running')`
- **Live:** `projects_with_multi_active_runs = 0`

### A5 — Video dispatch exclusivity / lease heartbeat

- **Intended:** `claim_video_job_for_dispatch` / `renew_video_job_lease` (`025`)
- **DB alone:** Columns nullable; no CHECK that `processing ⇒ lease_owner AND lease_expires_at`; no exclusion of two live workers except claim RPC.

### A6 — Cancelled run never returns to `running`

- **Intended:** reconcile refuses cancelled → running (`production-run-admin.ts`)
- **DB alone:** Status CHECK allows any listed value; no transition trigger.

### A7 — Language-variant content-item dedupe

- **Intended:** workflow lookup by `generation_metadata.source_content_item_id` + language
- **DB alone:** No unique on `(package_id, platform, language)` or `(source metadata, language)`.

---

## Not guaranteed

For each missing invariant: proposed SQL (sketch), suggested migration name, table(s), risk. **Do not apply** — audit only.

### N1 — No terminal run with open (`queued`/`running`) items

| | |
|--|--|
| **Status** | **Not guaranteed** — live **27** open items on `failed` runs |
| **Evidence** | Probe: `failed` + `queued` = 27; sample runs have `failed_total = 0` while items remain `queued` (trigger/stale fail closed parent without settling children) |
| **Table** | `production_runs`, `production_run_items` |
| **Migration** | `026_run_item_settlement_guards.sql` (suggested) |
| **Risk** | High — UI/settlement lie; GENERATE may look free while slots appear open; audits/reconcile assumptions break |

```sql
-- Option A: deferrable constraint trigger (preferred over CHECK — multi-table)
CREATE OR REPLACE FUNCTION enforce_terminal_run_has_no_open_items()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'cancelled') THEN
    IF EXISTS (
      SELECT 1 FROM production_run_items
      WHERE production_run_id = NEW.id
        AND status IN ('queued', 'running')
    ) THEN
      RAISE EXCEPTION
        'terminal production_run % still has open items', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_terminal_run_no_open_items
BEFORE UPDATE OF status ON production_runs
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'failed', 'cancelled'))
EXECUTE FUNCTION enforce_terminal_run_has_no_open_items();

-- Also block reopening items under a terminal parent:
CREATE OR REPLACE FUNCTION enforce_no_open_item_under_terminal_run()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  IF NEW.status IN ('queued', 'running') THEN
    SELECT status INTO parent_status FROM production_runs WHERE id = NEW.production_run_id;
    IF parent_status IN ('completed', 'failed', 'cancelled') THEN
      RAISE EXCEPTION
        'cannot open item % under terminal run %', NEW.id, NEW.production_run_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

### N2 — No `processing` video job without lease owner

| | |
|--|--|
| **Status** | **Not guaranteed** (live count currently 0) |
| **Table** | `video_jobs` |
| **Migration** | `026_video_job_lease_checks.sql` |
| **Risk** | High — stale reclaim / watchdog use lease; ownerless `processing` can duplicate paid renders or never reclaim cleanly |

```sql
ALTER TABLE video_jobs
  ADD CONSTRAINT video_jobs_processing_requires_lease
  CHECK (
    status <> 'processing'
    OR (
      lease_owner IS NOT NULL
      AND length(btrim(lease_owner)) > 0
      AND lease_expires_at IS NOT NULL
    )
  ) NOT VALID;
-- Backfill legacy rows, then VALIDATE CONSTRAINT.
```

### N3 — Exactly one active render per package (DB)

| | |
|--|--|
| **Status** | **Not guaranteed** — app assert only (A2) |
| **Table** | `video_jobs` (+ join `content_items`) |
| **Migration** | `027_one_active_package_render.sql` |
| **Risk** | High — double regenerate / heal / race → duplicate paid renders |

```sql
-- Primary-language items (language IS NULL): at most one active job per package.
CREATE UNIQUE INDEX uniq_active_primary_video_per_package
ON video_jobs (project_id, (
  SELECT ci.package_id FROM content_items ci WHERE ci.id = video_jobs.content_item_id
))
WHERE status IN ('queued', 'processing');
-- Postgres cannot use subquery in index expression like this.
-- Practical form: denormalize package_id onto video_jobs, then:
-- CREATE UNIQUE INDEX ... ON video_jobs (package_id)
--   WHERE status IN ('queued','processing') AND language IS NULL;
```

**Practical recommendation:** add `video_jobs.package_id` (+ optional `language`) maintained by trigger/app, then partial unique indexes. Without denormalization, enforce via constraint trigger scanning `content_items`.

### N4 — No orphan video (`content_item_id IS NULL`)

| | |
|--|--|
| **Status** | **Not guaranteed** — FK is `ON DELETE SET NULL`; insert allows null |
| **Live** | `orphan_videos_null_item = 0` |
| **Table** | `video_jobs` |
| **Migration** | `027_video_jobs_require_item.sql` (if product wants) |
| **Risk** | Medium — jobs without item never settle run identity; storage may still hold artifacts |

```sql
ALTER TABLE video_jobs
  ALTER COLUMN content_item_id SET NOT NULL;
-- Requires cleaning any nulls and changing ON DELETE behavior
-- (prefer RESTRICT or CASCADE over SET NULL).
```

### N5 — No orphan package (must retain strategy / must have items)

| | |
|--|--|
| **Status** | **Not guaranteed** for “must have strategy”; **partially intentional** |
| **Live** | 2 packages with `strategy_item_id IS NULL`; 0 packages without items; 1 content_item with `package_id IS NULL` |
| **Table** | `content_packages`, `content_items` |
| **Migration** | only if product forbids detached packages |
| **Risk** | Medium — detached packages from `013` cleanup are intentional; treating them as orphans would be wrong without a product rule |

```sql
-- Only if detached packages are forbidden going forward:
ALTER TABLE content_packages
  ALTER COLUMN strategy_item_id SET NOT NULL;
-- Conflicts with 013 detach strategy; would need a different orphan definition
-- (e.g. no content_items) enforced by trigger instead.
```

### N6 — No orphan / mismatched translation

| | |
|--|--|
| **Status** | Hard FK orphans **Guaranteed** (G8); **package↔source mismatch Not guaranteed** |
| **Live** | `translation_package_mismatch = 0` |
| **Table** | `translation_jobs` |
| **Migration** | `028_translation_package_matches_source.sql` |
| **Risk** | Medium — wrong package association; cancel-by-package can miss units |

```sql
CREATE OR REPLACE FUNCTION enforce_translation_package_matches_source()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE src_package uuid;
BEGIN
  SELECT package_id INTO src_package FROM content_items WHERE id = NEW.source_content_item_id;
  IF src_package IS DISTINCT FROM NEW.package_id THEN
    RAISE EXCEPTION 'translation_jobs.package_id must match source item package';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_translation_package_matches_source
BEFORE INSERT OR UPDATE ON translation_jobs
FOR EACH ROW EXECUTE FUNCTION enforce_translation_package_matches_source();
```

### N7 — No duplicate strategy package under concurrent writers that null strategy

| | |
|--|--|
| **Status** | Non-null uniqueness **Guaranteed** (G1); **semantic** “one package per strategy forever” **Not guaranteed** if app nulls `strategy_item_id` then inserts another |
| **Table** | `content_packages` |
| **Risk** | Medium — rare; frees unique slot by detach |

### N8 — Run counters match item statuses

| | |
|--|--|
| **Status** | **Not guaranteed** — live `terminal_runs_with_counter_drift = 2` |
| **Table** | `production_runs` |
| **Migration** | same family as N1 (settle atomically or trigger-maintain counters) |
| **Risk** | Medium — operator counters wrong; completion math drifts |

```sql
-- Sketch: AFTER INSERT/UPDATE/DELETE on production_run_items,
-- recompute parent generated_total / failed_total / requested_total.
-- Prefer fixing writers + N1 first; counter triggers are secondary.
```

---

## Unknown

### U1 — Definition of “orphan package”

`013` explicitly detaches duplicate packages by nulling `strategy_item_id`. Ad-hoc packages may also be null. Without a product rule (“every package must map to a strategy item” vs “detached allowed”), orphan-package cannot be classified beyond N5 notes.

### U2 — Multiple `completed` video jobs per content item

Live data shows items with 2–7 `completed` jobs (regen/scene history). If the invariant is “at most one completed render,” it is **Not guaranteed**. If history is intentional, the invariant does **not** apply. **Unknown** which product rule is correct.

### U3 — Whether `failed` parent + all-`queued` children is acceptable

Observed on early trigger failures (`generated_total=0`, `failed_total=0`, items still `queued`). May be historical. Runtime docs say Stop/reconcile should settle; stale fail may not. Classify desired end-state as N1; historical acceptance is **Unknown**.

### U4 — Claim row `generating` while package already exists

RPC short-circuits on existing package for *new* claims, but a crash after insert before `release_package_generation_claim` can leave `generating` + package. Live `live_claims_with_existing_package = 0`. Whether that state must be impossible is **Unknown** (watchdog/expiry may be enough).

---

## Example invariants — explicit mapping

| Example from brief | Classification | Evidence |
|--------------------|----------------|----------|
| Exactly one active package generation | **Application only** (A1); row uniqueness **Guaranteed** (G2) | PK + RPC lease; table still writable |
| Exactly one active render | **Not guaranteed** (N3) / app **A2** | No unique; assert only |
| No completed run with running items | **Not guaranteed** (N1) | 27 live open items on `failed` runs |
| No processing lease without owner | **Not guaranteed** (N2) | Nullable columns; no CHECK |
| No orphan package | **Unknown** (U1) / **Not guaranteed** (N5) if “must have strategy” | Detached allowed by `013` |
| No orphan video | **Not guaranteed** (N4) | `ON DELETE SET NULL` |
| No orphan translation | Hard orphans **Guaranteed** (G8); mismatch **Not guaranteed** (N6) | CASCADE vs no match trigger |
| No duplicate strategy package | **Guaranteed** (G1) for non-null | Partial unique index |

---

## Live probe snapshot (2026-07-23)

| Probe | Count |
|-------|------:|
| Duplicate non-null strategy packages | 0 |
| Multi active claim rows | 0 |
| `processing` without owner | 0 |
| `processing` without lease expiry | 0 |
| Terminal run + open items | **27** |
| Orphan videos (`content_item_id` null) | 0 |
| Packages with zero items | 0 |
| Translation package≠source package | 0 |
| Packages with >1 active primary render | 0 |
| Packages with >1 active variant render | 0 |
| Projects with >1 active run | 0 |
| Live generating claim + existing package | 0 |
| Terminal runs with counter drift | **2** |
| Packages with null strategy_item_id | 2 |
| Content items with null package_id | 1 |

---

## Priority gaps (if a follow-up migration phase is approved)

1. **N1** — terminal run ↔ open items (live violations)  
2. **N2** — `processing` requires lease owner + expiry  
3. **N3** — one active render (needs `package_id` denorm or constraint trigger)  
4. **N8** — counter consistency (after N1)  
5. **N6** — translation package matches source  
6. Decide **U1/U2** product rules before coding orphan / completed-job uniqueness

---

## Related docs

- `docs/architecture/production-runtime.md` — intended runtime invariants  
- `docs/audits/production-reliability/concurrency-review.md` — race catalog  
- `docs/audits/production-reliability/state-machines.md` — transition ownership  

---

## Return buckets (canonical)

### Guaranteed
G1 duplicate strategy package · G2 claim PK · G3 claim status · G4 translation unique · G5 run package_index · G6 run strategy_item · G7 cancel revive · G8 translation CASCADE · G9 package→items CASCADE · G10 status domains

### Application only
A1 live package-generation exclusivity · A2 one active package render · A3 variant slot RPC · A4 one active run/project · A5 video lease RPC · A6 cancelled stays cancelled · A7 variant item dedupe

### Not guaranteed
N1 terminal run with open items · N2 processing without lease owner · N3 DB one-active-render · N4 orphan video null item · N5 orphan/detached package · N6 translation package mismatch · N7 re-bind after detach · N8 counter drift

### Unknown
U1 orphan-package definition · U2 multi-completed videos · U3 historical failed+queued acceptance · U4 generating claim after package insert
