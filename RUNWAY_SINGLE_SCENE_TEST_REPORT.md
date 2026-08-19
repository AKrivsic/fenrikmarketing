# Runway single-scene test — report

Datum: 2026-08-15  
Rozsah: interní admin test jedné scény přes Runway. Produkční `video-worker`, FFmpeg, n8n a Content Packages se neměnily.

## 1. Implementované chování

Admin pod `/settings/runway-test` může:

1. vybrat projekt,
2. vybrat existující completed `video_job` scénu s `image_bucket` + `image_path`,
3. vidět náhled stillu (krátkodobá signed URL),
4. zadat motion prompt,
5. vidět read-only model / duration / ratio / odhad ceny,
6. potvrdit placenou generaci,
7. sledovat stav Runway tasku přes krátké status requesty,
8. po `SUCCEEDED` přehrát klip z Fenrik Storage,
9. vidět historii předchozích testů.

Generace se **nespouští** při načtení stránky, výběru projektu ani změně formuláře.

## 2. Cesta stránky

`/settings/runway-test`

- Middleware chrání prefix `/settings` (admin cookie).
- Odkaz ze `/settings`.
- API pod `/api/admin/runway-test/*` kontrolují `requireAdminSession()` (middleware API nechrání).

## 3. Databázové změny

Migrace: `supabase/migrations/033_runway_test_jobs.sql`  
Aplikováno na remote projekt přes Supabase MCP (`apply_migration`).

Tabulka `public.runway_test_jobs`:

- jedna řádka = jeden placený create pokus,
- `client_request_id` UNIQUE (idempotence),
- status CHECK: `created|pending|running|succeeded|failed|cancelled|download_failed`,
- source bucket/path (ne signed URL),
- output bucket/path po stažení,
- RLS + `owns_project`, granty pro `service_role`, revoke `anon`/`authenticated`.

## 4. Změněné / nové soubory

**Nové**

- `supabase/migrations/033_runway_test_jobs.sql`
- `lib/runway-test/types.ts`
- `lib/runway-test/constants.ts`
- `lib/runway-test/config.ts`
- `lib/runway-test/scenes.ts`
- `lib/runway-test/auth.ts`
- `lib/runway-test/service.ts`
- `app/settings/runway-test/page.tsx`
- `components/settings/RunwayTestPanel/RunwayTestPanel.tsx`
- `components/settings/RunwayTestPanel/RunwayTestPanel.module.css`
- `app/api/admin/runway-test/create/route.ts`
- `app/api/admin/runway-test/scenes/route.ts`
- `app/api/admin/runway-test/jobs/route.ts`
- `app/api/admin/runway-test/[id]/status/route.ts`
- `scripts/check-runway-scene-test.ts`
- `RUNWAY_SINGLE_SCENE_TEST_REPORT.md`

**Změněné**

- `lib/api/storage.ts` — `buildRunwayTestPath`
- `app/settings/page.tsx` — odkaz na test
- `app/settings/page.module.css`
- `package.json` — `check:runway-scene-test`

## 5. Bezpečnostní ochrany

- Admin cookie na stránce (middleware) i na API (`requireAdminSession`).
- Status / create vyžadují `projectId` a job musí patřit stejnému projektu.
- Scéna z cizího projektu → `video_job_project_mismatch` (403).
- Arbitrary Runway task ID nestačí: poll jen přes `runway_test_jobs.id` + `project_id`.
- Signed URL jen dočasně; v DB bucket/path.
- Create POST: provider default maxAttempts=1; idempotentní `clientRequestId`.
- UI: confirm step + disable + submit lock.

## 6. Výběr vstupního obrázku

Z `video_jobs` se statusem `completed` se čte `output.render_spec.scenes[]`.

Použitelné jen scény s neprázdným `id`, `image_bucket` a `image_path` (`extractUsableSceneStills`). Starší joby bez bucketu se přeskočí — bez oprav dat.

## 7. Signed URL

- Vstup pro Runway: `createSignedUrl` TTL **15 min** (`sourceSignedUrlTtlSeconds`).
- Náhled / playback: TTL **60 min**.
- Do DB se signed URL neukládá.
- Kanonická identita: `source_image_bucket` + `source_image_path`.

## 8. Ochrana před dvojitou placenou generací

1. UI `clientRequestId` (UUID) + disable tlačítka + `submitLock`.
2. DB UNIQUE `client_request_id` — opakovaný create vrací existující řádek, **bez** nového Runway POST.
3. Update `runway_task_id` jen když je ještě `null`.
4. `confirmPaidGeneration: true` povinné.

## 9. Uložení hotového MP4

Po provider `succeeded`:

1. stáhne HTTPS video URL,
2. ověří HTTP OK,
3. `Content-Type` musí začínat `video/`,
4. limit `80 MB`,
5. upload do `video-renders` na  
   `{projectId}/runway-tests/{testJobId}/output.mp4`,
6. DB: `output_bucket` / `output_path`, status `succeeded`.

Opakovaný status při existujícím `output_path` **nestahuje znovu**.

## 10. Stavy test jobu

| Status | Význam |
|---|---|
| `created` | řádek vložen, create ještě neproběhl / selhal před task id |
| `pending` | Runway task čeká / throttled |
| `running` | Runway běží |
| `succeeded` | MP4 ve Storage |
| `failed` | Runway failed |
| `cancelled` | Runway cancelled |
| `download_failed` | Runway OK, ale stažení/upload selhal |

TS `RUNWAY_TEST_JOB_STATUSES` = DB CHECK.

## 11. Cena v UI

Fixní ceník v `lib/runway-test/constants.ts` (2026-08-15):

- `gen4_turbo`: 5 kreditů / s
- 1 kredit = $0.01
- 5 s → **25 kreditů / $0.25**

Zdroj: https://docs.dev.runwayml.com/guides/pricing/

Tlačítko: `Vygenerovat 5s klip — odhad $0.25` + potvrzovací krok.

## 12. Testy a výsledky

```bash
npm run check:runway-scene-test   # 14 passed, 0 failed
npm run check:runway-image-to-video  # 19 passed, 0 failed
npx tsc --noEmit                  # OK
npx eslint … (změněné soubory)    # OK
```

Covered: auth wiring, cizí projekt, jeden create POST, duplicate clientRequestId, prompt validace, pending/running, single download, failed/cancelled, bad/large download, status CHECK vs TS, žádný reálný Runway host.

## 13. Co nebylo implementováno

- Napojení na produkční video pipeline / FFmpeg / n8n
- Benchmark Lab, hvězdičky, porovnání
- Model switcher, seed UI, jiné duration/ratio
- Ephemeral Runway upload
- Automatický Claude motion prompt
- Veřejný endpoint
- Ruční kliknutí na placenou generaci v tomto kroku

## 14. Potvrzení: žádný skutečný Runway generation request

Testy mockují provider / fetch. Během implementace nebyl odeslán create na `api.dev.runwayml.com`. Generační tlačítko nebylo použito proti živému API.

## 15. Potvrzení: žádné placené náklady

Nevznikly Runway kredity ani jiné placené AI náklady z tohoto kroku.
