# Fenrik Studio — hodnocení projektu

Snapshot 2026-07-21 · ~130k LOC TS/SQL · 145 commitů od 2026-06-04 · služba „content package“, ne DIY SaaS

> **Verdikt:** produkčně vyspělá AI content factory prodávaná jako done-for-you služba. Silná technická moat v pipeline; komerčně ready pro operator-led delivery, ne pro škálovaný self-serve SaaS.

| Dimenze | Skóre | Verdikt |
|---|---|---|
| Rozsah | 8 / 10 | Velký produkční systém, ne MVP skript |
| Složitost | 9 / 10 | Multi-agent pipeline + workers + quality gates |
| Komerční využití | 7 / 10 | Připraveno jako služba; ne jako self-serve SaaS |
| Konkurenceschopnost | 6.5 / 10 | Silná diference v pipeline; slabší v GTM a škále |

---

## 1. Rozsah

Za ~7 týdnů vývoje vznikl systém na úrovni malého studia: marketing + admin OS + 2 workery + n8n orchestry + 25 DB tabulek. To je výrazně nad typickým „AI MVP“.

| Metrika | Hodnota |
|---|---|
| Kód | ~130k LOC (TS/TSX/SQL bez node_modules) |
| Povrch produktu | 28 stránek · 33 API · 28 AI workflow souborů |
| Runtime | 3 služby — Next.js · video-worker · capture-worker |

| Oblast | Soubory | Řádky |
|---|---|---|
| lib/ (AI, API, creative, scenes) | 414 | ~70k |
| scripts/ (guardrails, ops) | 107 | ~32k |
| components/ + app/ | 184 | ~18k |
| video-worker + capture-worker | 48 | ~10k |
| supabase migrations | 23 | ~1.3k |

Pozn.: ~25 % kódu jsou guardrail/ops skripty — typické pro generativní produkt s kvalitativními riziky, méně typické pro tenký SaaS.

---

## 2. Složitost

Složitost je vysoká záměrně: multi-stage generativní pipeline s kvalitativními branami, ne jednoduchý „prompt → caption“.

| Vrstva | Co je náročné |
|---|---|
| Orchestry | Vercel → n8n.fenrik.chat → API → renderer.fenrik.chat |
| Creative Engine v3 | Inventované koncepty, fidelity, story/product-demo integrity |
| Video production | Typed scenes, FFmpeg, TTS, SFX, subtitles, scene editor |
| Website ingest | Knowledge extraction + Playwright component capture |
| Quality ops | 93 check:* skriptů, production runs, controlled stop |

Stack highlights: Claude + OpenAI dual model · n8n thin orchestration · FFmpeg render path · RLS + 23 migrací · cs / en / sk jazyky

> **Riziko:** vysoká kognitivní zátěž pro jednoho developera/operátora. Bez formalizovaného CI a dokumentovaného onboarding se systém stává „bus-factor 1“ aktivem.

---

## 3. Komerční využití

### Business model (aktuální)

Done-for-you Content Package: 1 short-form video + paste-ready copy pro 7 platforem. Explicitně: „we are not software and we do not run your accounts.“ Ceník na landingu: Weekly $199 · Two Weeks $349 · Monthly $599 + free sample.

| Signál | Stav | Poznámka |
|---|---|---|
| Veřejná nabídka + ceny | Ano | $199 / $349 / $599 batchy + free sample |
| Lead capture + e-mail | Ano | sample_requests + Resend |
| Client delivery / review | Ano | clients, client_projects, /client-review |
| Produkční infra | Ano | Vercel + n8n + DigitalOcean renderer |
| Stripe / self-serve billing | Ne | paid = manuální boolean, ne SaaS billing |
| Multi-tenant auth | Ne | Sdílené admin heslo, single-tenant |
| CI + formal test suite | Slabé | Guardrail skripty ano; Jest/Vitest/CI ne |

### Kde už vyděláváte

- Operator-led funnel: sample → výroba → client review → paid batch
- Fiverr jako akviziční kanál v kódu
- Dogfooding na tryfenrik.com / Fenrik brand
- Unit economics lepší než agentura (AI pipeline + málo lidí)

### Kde ještě nevyděláváte

- Self-serve checkout / subscriptions
- Per-user účty a multi-tenant RLS jako produkt
- Automatické publishování na sociální sítě
- Škálování bez lineárního operator času

---

## 4. Konkurenceschopnost

Fenrik nehraje proti editorům — hraje proti „nemám čas na content“ a proti levným gigs. Moat je v produkční pipeline a brand-true assets z webu, ne v UI editoru.

| Konkurenční kategorie | Pozice Fenrik | Edge |
|---|---|---|
| DIY AI video (Opus, InVideo, Pictory) | Hotový balíček z URL, ne editor | Výhoda služby |
| Schedulery (Buffer, Later) | Paste-ready copy, ne správa účtů | Jiná kategorie |
| Agentury / Fiverr gigs | Interní AI factory + konzistentní pipeline | Výhoda nákladů/rychlosti |
| Self-serve SaaS content tools | Zatím není produkt této kategorie | Slabina (zatím) |

### Silné stránky vs trh

Creative Engine v3 (inventované koncepty, anti-repetition) · website → brand assets · multi-platform SKU · typed cinematic scenes · CEE jazyky (cs/sk/en)

### Slabiny vs trh

Brand awareness mimo niche · žádný network effect · výstup stále vyžaduje lidský review · konkurenti mají větší marketing budget a distribution · service model má strop kapacity

---

## Strategické čtení

### Service studio — fit

Nejlepší fit dnes. Pipeline snižuje COGS a zrychluje delivery. Cíl: 10–30 retainer klientů, ne 10k self-serve users.

### Productized SaaS — later

Vyžaduje billing, auth, onboarding, support, CI. Pipeline je aktivum — ale produktová vrstva chybí ~30–40 % práce.

### White-label / API — hybrid

Pro agentury: „pošli URL, dostaneš balíček“. Monetizuje moat bez boje s InVideo o UI.

---

## Celkové hodnocení

Ambiciózní a technicky nadprůměrný projekt pro ranou fázi. Komerčně smysluplný jako AI-powered content studio. Konkurenceschopný lokálně/v niche (Fiverr, CEE, service SMBs), pokud se GTM a kapacita operátorů drží kvality pipeline. Největší riziko není technologie — je to škálování nabídky bez ztráty kontroly kvality.

---

*Zdroj: repo fenrikmarketing · LOC měřeno 2026-07-21 · pricing z `app/page.tsx` · infra z `docs/server-migration-audit.md`*
