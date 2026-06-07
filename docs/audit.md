# Technický audit – fenrikmarketing (AI Content Manager)

> Datum: 5. 6. 2026
> Zdroje: GitHub MCP, Vercel MCP, Supabase MCP + analýza lokálního kódu
> Repozitář: `AKrivsic/fenrikmarketing` (public) · Vercel projekt: `fenrikmarketing` · Supabase projekt: `ai-content-manager` (`syijxdgekowpcboxpeyl`, region eu-west-1, Postgres 17)

---

## 1. Shrnutí (TL;DR)

Projekt je **rozsáhlá, dobře strukturovaná Next.js 16 aplikace** (AI content manager s n8n automatizací, AI provider vrstvou a samostatným video-workerem). Kvalita kódu a vrstvení jsou nadprůměrné, dokumentace v kódu je výborná.

Audit ale odhalil **tři kritické problémy**, které je nutné vyřešit dřív, než půjde cokoli do produkce:

| # | Závažnost | Problém |
|---|-----------|---------|
| K1 | 🔴 Kritická | **Aplikace nemá žádnou autentizaci** – UI běží výhradně přes service-role `admin` klienta, který obchází RLS. Po nasazení je vše veřejně přístupné. |
| K2 | 🔴 Kritická | **Veškerý kód aplikace je necommitnutý.** Git i Vercel obsahují pouze `Initial Next.js setup`. Nasazená produkce ≠ skutečná aplikace; chybí historie a záloha. |
| K3 | 🟠 Vysoká | **Veřejné/nechráněné API routes** (`/api/ai/*`, `/api/automation/*`) bez ověření uživatele – riziko zneužití a nákladů na AI. |

---

## 2. Architektura

### 2.1 Tech stack
- **Framework:** Next.js `16.2.7` (App Router), React `19.2.4`, Turbopack
- **Jazyk:** TypeScript 5, striktní vrstvení, path alias `@/*`
- **Styly:** CSS Modules + Tailwind v4 (`@tailwindcss/postcss`)
- **DB/Backend:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Postgres 17
- **Validace:** Zod v4
- **Automatizace:** n8n (webhooky in/out), samostatný **video-worker** (Node HTTP server, FFmpeg pipeline)
- **AI:** Claude (strategie, copywriting, scoring, evergreen) + OpenAI (obrázky, TTS, JSON repair)

### 2.2 Vrstvení (čisté a konzistentní)
```
app/                 → Next.js routes (pages, API routes, server actions)
components/          → UI komponenty (feature-foldery + CSS modules)
lib/api/            → datová vrstva (Supabase dotazy)
lib/ai/             → workflows, prompts, schémata, provider routing
lib/n8n/            → odchozí klient + příchozí callback pipeline
lib/supabase/       → server / client / admin klienti + typy
lib/video-engine/   → Zod schémata pro render pipeline
video-worker/       → samostatný render service
supabase/migrations → 9 SQL migrací
```

### 2.3 Silné stránky
- **Výborné komentáře** vysvětlující *proč* (ne *co*) – zejména u `admin.ts`, `guards.ts`, `callback.ts`.
- **Centralizované AI provider routing** (`lib/ai/index.ts`) – pravidla na jednom místě, lazy singletony.
- **Cross-project guards** (`lib/api/guards.ts`) – uzavírají mezeru, kterou samotné RLS nepokrývá (linkování child řádku na cizí projekt téhož uživatele).
- **Bezpečné n8n callbacky** – konstantní časové porovnání tajemství (`timingSafeEqual`), oddělené secrety pro vstup (`N8N_CALLBACK_SECRET`) a výstup (`N8N_WEBHOOK_SECRET`).
- **Video-worker auth** – stejný vzor (`x-video-worker-secret`, constant-time).
- Konzistentní error-envelope a mapování chyb na HTTP statusy (`WorkflowError`, `CallbackValidationError`).

### 2.4 Architektonické slabiny
- **Dva paralelní přístupové paradigmata k datům:**
  - UI/server actions → `*-admin.ts` přes **service-role admin klienta** (RLS obejito).
  - `/api/ai/*` a `/api/automation/*` → `createSupabaseServerClient()` (RLS aktivní, cookie-bound).

  Protože **neexistuje přihlášený uživatel**, `auth.uid()` je `NULL` → RLS dotazy nevrátí nic. To znamená, že AI/automation routes by ve skutečnosti **nefungovaly** (vrátí `not_found`), zatímco UI funguje jen díky obcházení RLS. Vrstvy si vzájemně odporují.
- **Chybí middleware** (`middleware.ts` neexistuje). Komentář v `lib/supabase/server.ts` přitom spoléhá na to, že „surrounding middleware“ obnovuje session. Bez něj by Supabase SSR auth ani po doplnění loginu nefungovala správně.
- **Mrtvý/duplicitní kód:** `lib/api/projects.ts` obsahuje korektní auth (`requireUserId`, `auth.getUser`), ale není používán – UI volá `lib/api/projects-admin.ts`.
- **`next.config.ts` je prázdný** – chybí např. nastavení `serverExternalPackages`, security headers apod.

---

## 3. Databázové schéma

15 tabulek v `public`, vše s **RLS enabled ✅**. Doménový model je promyšlený a normalizovaný.

**Hlavní entity:** `projects` (root tenant), `assets` / `asset_variants` / `asset_usage`, `evergreen_topics`, `trends`, `content_strategies` / `content_strategy_items`, `content_packages`, `content_items`, `ai_visuals`, `video_jobs`, `publishing_schedule`, `content_versions`, `content_performance`.

**Pozitiva:**
- Silné typování přes Postgres enumy (`project_type`, `platform_type`, `funnel_stage`, `job_status`, `approval_status`, …).
- Konzistentní `project_id` na všech child tabulkách (umožňuje plošné RLS přes `owns_project`).
- CHECK constrainty (`signal_strength 1–10`, `priority 1–5`).
- `updated_at` triggery (migrace 007), `gen_random_uuid()` PK, FK integrita kompletní.
- Migrace jsou rozdělené logicky (enums → tabulky → indexy → RLS → storage → triggery → AI sloupce → fix).

**Slabiny:**
- 10 **neindexovaných foreign keys** (viz §6) – při růstu dat zpomalé JOINy/DELETE.
- Hojné použití volného `jsonb` (`*_brief`, `metadata`, `tone_of_voice`, `publishing_rules`) – flexibilní, ale bez DB-level garancí; validace leží jen v aplikaci.
- DB je prakticky prázdná (`projects` = 1 řádek, ostatní 0) → statistiky/advisory o „unused index“ jsou zatím očekávané.

---

## 4. RLS Policies

RLS je **zapnuté na všech 15 tabulkách** a vzor je čistý:

- `projects`: 4 samostatné policy (SELECT/INSERT/UPDATE/DELETE) přes `owner_id = auth.uid()`.
- Všechny ostatní tabulky: jedna `ALL` policy přes **SECURITY DEFINER funkci `owns_project(project_id)`** – elegantní jediný zdroj pravdy pro tenant isolation.

**Zjištěné problémy:**
- 🟠 **Policy cílí na roli `public`, ne `authenticated`.** Funkčně je sice chrání `auth.uid()` (anon dostane `NULL`), ale best practice je `TO authenticated`. Advisory to hlásí.
- 🟠 **`owns_project` (SECURITY DEFINER) je spustitelná rolemi `anon` i `authenticated`** přes `/rest/v1/rpc/owns_project`. Doporučení: `REVOKE EXECUTE ... FROM anon, authenticated` (volá se interně z policy, ne klientem).
  - Remediace: <https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable>
- 🟡 **`auth_rls_initplan`** – v policy na `projects` se `auth.uid()` vyhodnocuje per-row. Nahradit `auth.uid()` za `(select auth.uid())`.
  - Remediace: <https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select>
- ⚠️ **RLS je v praxi obcházeno** service-role admin klientem (viz K1) – takže aktuálně RLS *nechrání produkční přístup k datům přes UI*.

---

## 5. Deploymenty (Vercel)

- Projekt `fenrikmarketing` (`prj_ycfwqCLdMP2d9U8LqdoOohR2RmY1`), team `alexandr-krivsics-projects`.
- **Jediný deployment:** `dpl_54gHHcWmxtgi53hNUip4VJM9i2rp`
  - Stav: `READY`, target `production`
  - Commit: **`Initial Next.js setup`** (`d504ff5`), branch `main`
  - Bundler: Turbopack, runtime: Node.js
- 🔴 **Nasazená produkce je pouze prázdný Next.js scaffold** – žádná z funkcí AI content manageru (routes, AI workflows, n8n, video) není nasazena.
- ⚠️ `githubCommitVerification: "unverified"` – commity nejsou GPG podepsané.
- ⚠️ Repozitář je **public** – po commitnutí kódu zvážit private (obsahuje business logiku, prompty, n8n kontrakty).

---

## 6. Bezpečnostní problémy

### 🔴 Kritické
1. **Žádná autentizace (K1).** Neexistuje login stránka, middleware ani session gating. Celé UI (`dashboard`, `projects`, `review-queue`, `settings`, …) čte/zapisuje přes **service-role admin klienta** (`lib/api/*-admin.ts`), který RLS obchází. Komentář v `projects-admin.ts` to potvrzuje: *„MVP has no user session yet“*. **Po nasazení = veřejný přístup ke všem datům a mutacím.**
2. **Service-role klíč jako jediná ochrana dat.** Jakákoli chyba (omylem importovaný admin klient do client bundlu, leak env) = totální kompromitace. Runtime guard `typeof window` je dobrý, ale je to poslední linie obrany.

### 🟠 Vysoké
3. **Nechráněné API routes.** `/api/ai/score-trend`, `/api/automation/trend-scan` aj. nemají žádné ověření uživatele ani sdílený secret – kdokoli je může volat. I když RLS část zablokuje, stále spouští DB dotazy a (u `/api/ai/*`) **placené AI volání** → riziko nákladů / DoS.
4. **`owns_project` spustitelná přes veřejné REST RPC** (viz §4).

### 🟡 Střední / nízké
5. **Leaked password protection vypnutá** (Supabase Auth) – zapnout (HaveIBeenPwned).
   - <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
6. **`set_updated_at` má mutable `search_path`** – nastavit `SET search_path = ''`.
   - <https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable>
7. **Public GitHub repozitář** s business logikou a prompty.
8. **Žádné security headers** v `next.config.ts` (CSP, HSTS, X-Frame-Options).

### ✅ Co je bezpečnostně dobře
- n8n callbacky i video-worker: constant-time porovnání secretu, oddělené secrety pro směr in/out.
- Service-role klíč čten z ne-`NEXT_PUBLIC_` env → Next.js ho neinlinuje do klienta.
- `.gitignore` korektně ignoruje `.env*` a `.vercel`.
- Cross-project guards proti úniku mezi projekty téhož uživatele.

---

## 7. Technický dluh

| Oblast | Dluh | Dopad |
|--------|------|-------|
| **Verzování** | 🔴 Veškerý kód (desítky souborů) je **necommitnutý**; jediný commit je scaffold. | Žádná historie, žádná záloha, nelze rollbackovat, riziko ztráty práce. |
| **Auth** | Chybí kompletní auth vrstva + middleware; existují dvě protichůdná data paradigmata. | Blokuje produkci; nutný refaktor `*-admin` → RLS přes přihlášeného uživatele. |
| **Testy** | Žádný test framework. Jen `check:*` guardrail skripty (běží přes experimentální `--experimental-strip-types`). | Žádná regresní ochrana; experimentální runtime flag je křehký. |
| **CI/CD** | Žádný GitHub Actions workflow (lint/build/test/typecheck) před deploy. | Chyby se odhalí až v produkci. |
| **Mrtvý kód** | `lib/api/projects.ts` (auth varianta) je nepoužitý vedle `projects-admin.ts`. | Matoucí, riziko použití špatné vrstvy. |
| **Konfigurace** | Prázdný `next.config.ts`; default `README.md` (create-next-app). | Chybí dokumentace setupu, env proměnných, runbooku. |
| **DB indexy** | 10 neindexovaných FK; `auth_rls_initplan` (per-row eval). | Výkon při růstu dat. |
| **Env management** | Velké množství env proměnných (`SUPABASE_SERVICE_ROLE_KEY`, `N8N_*`, `VIDEO_WORKER_*`, AI klíče) bez `.env.example`. | Náročný onboarding, riziko misconfigurace. |

**Neindexované FK (doplnit krycí indexy):**
`ai_visuals.asset_id`, `ai_visuals.content_item_id`, `content_packages.strategy_item_id`, `content_performance.project_id`, `content_strategy_items.topic_id`, `content_strategy_items.trend_id`, `content_versions.created_by`, `content_versions.project_id`, `publishing_schedule.content_item_id`, `video_jobs.content_item_id`.

---

## 8. Doporučení (prioritizováno)

### P0 – Nutné před produkcí
1. **Commitnout a zazálohovat veškerý kód** do gitu (rozumné logické commity), případně přepnout repo na private.
2. **Zavést autentizaci** (Supabase Auth + login stránka + `middleware.ts` pro refresh session).
3. **Přepnout datovou vrstvu z `*-admin` (service-role) na RLS** přes přihlášeného uživatele; admin klienta nechat výhradně pro trusted server-to-server (n8n callbacky, worker).
4. **Zabezpečit `/api/ai/*` a `/api/automation/*`** – vyžadovat přihlášeného uživatele (nebo sdílený secret u čistě strojových endpointů).

### P1 – Krátkodobě
5. RLS policy → `TO authenticated`; `REVOKE EXECUTE` na `owns_project` od `anon`/`authenticated`.
6. `auth.uid()` → `(select auth.uid())` v policy na `projects`.
7. Zapnout leaked password protection; opravit `search_path` u `set_updated_at`.
8. Přidat GitHub Actions CI (typecheck + lint + build) napojené na Vercel preview.
9. Doplnit krycí indexy na 10 neindexovaných FK.

### P2 – Střednědobě
10. Zavést test framework (Vitest) a převést `check:*` skripty na regulérní testy.
11. Smazat mrtvý `lib/api/projects.ts` (nebo z něj udělat jedinou produkční variantu po zavedení auth).
12. Doplnit `next.config.ts` (security headers, `serverExternalPackages`), přepsat `README.md`, přidat `.env.example`.
13. Zvážit migraci video-workeru z `--experimental-strip-types` na build krok / stabilní runtime.

---

## 9. Sběr dat (provenance)

- **GitHub MCP:** `get_me`, `git remote`/`git log` → repo `AKrivsic/fenrikmarketing`, 1 commit.
- **Vercel MCP:** `list_teams`, `list_projects`, `list_deployments` → 1 production deployment (scaffold).
- **Supabase MCP:** `list_projects`, `list_tables` (verbose), `list_migrations`, `get_advisors` (security + performance), `execute_sql` (`pg_policies`, `pg_proc`).
- **Lokální kód:** vrstvy `app/`, `lib/`, `video-worker/`, migrace, konfigurace.
