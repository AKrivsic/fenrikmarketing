# VIDEO_REEL_ORCHESTRATOR_STEP_6_REPORT

Datum: 2026-08-15

## 1. Rozšířený scene media kontrakt

Volitelný objekt `video_clip` na `sceneSchema` i `persistedSceneSchema`:

```ts
video_clip?: {
  bucket: string;              // povinné
  path: string;                // povinné — kanonická identita s bucket
  provider?: string;           // opaque, ne jen Runway
  model?: string;
  duration_seconds?: number;   // hint; vždy se re-probe
  has_audio?: boolean;         // hint; vždy se re-probe
  generation_attempt_id?: string;
}
```

Soubory: `lib/video-engine/schemas/sceneVideoClipSchema.ts`, úpravy `sceneSchema.ts`, `renderSchema.ts`, export v `schemas/index.ts`.

Stávající `image_bucket` / `image_path` / `image_prompt` beze změny.

## 2. Backward compatibility

- Image-only render specs procházejí `renderSchema` bez `video_clip`.
- Persisted still-only scény zůstávají validní.
- Žádná migrace DB; žádný required field.

## 3. Readiness pravidla

Čistá funkce `assessVideoClipRenderReadiness` (`lib/video-engine/videoClipReadiness.ts`):

| Stav | Výsledek |
| --- | --- |
| všechny scény mají validní `video_clip` | `ready` |
| chybí klip | `not_ready` / `missing_video_clip` |
| neplatná identita (`../`, prázdný bucket/path, absolutní path) | `not_ready` / `invalid_storage_identity` |
| duplicate scene id | `not_ready` / `duplicate_scene_id` |
| neplatný objekt klipu | `not_ready` / `invalid_video_clip` |

Smíšený video+still render **není** podporován — chybějící klip = `not_ready`, bez tichého fallbacku a bez placené generace.

Vrací také `assetsToDownload` (clipy + volitelná music/ambient).

## 4. Orchestrátor a vstupy

`orchestrateVideoClipReel` — `video-worker/services/reel/orchestrateVideoClipReel.ts`

Vstup:

- scény s `video_clip`,
- lokální `voiceoverPath`,
- volitelný `srtPath`,
- volitelná music/ambient durable ref,
- volitelné lokální SFX eventy,
- injektovaný `downloader`,
- VO duration / tail / max clip size.

Tok: readiness → temp dir → download → probe → audio mix → `renderVideoClipsMp4` → thumbnail → cleanup mezisouborů → výsledek.

**Není** importován v `jobRunner.ts`.

## 5. Storage download abstraction

```ts
interface DurableAssetDownloader {
  downloadAsset({ bucket, path, destinationPath }): Promise<void>
}
```

- `downloadDurableAsset` — identity check, partial file, size limit, rename.
- `createLocalFixtureDownloader` — kopíruje lokální fixtures (testy).
- Žádný Supabase klient uvnitř render logiky.

## 6. Bezpečnost souborů

- validace bucket/path (prázdné, `../`, absolutní cesty, null bytes),
- lokální názvy `scene-000.mp4` (ne storage filename),
- max velikost (default 120 MiB),
- ověření video streamu přes ffprobe,
- chyba downloadu / missing / empty / too large → `DurableDownloadError`,
- cleanup workdir při chybě.

## 7. Voiceover timeline

```text
target = voiceoverDuration + tailBuffer (default TAIL_BUFFER_SECONDS)
```

- vizuální timeline kratší → last-frame hold (existující clip renderer),
- delší → trim na audio master,
- diagnostika: VO / visual / target / final + warnings.

## 8. Scene audio

- `has_audio === true` → re-probe; pokud stream existuje → mix; jinak skip + diagnostika `declared_has_audio_but_missing_stream`,
- `has_audio === false` / chybí → scene audio se nepoužije.

## 9. Music, ambient, SFX

- Music/ambient: volitelné durable `{ bucket, path }` (+ gain/loop/fade),
- SFX: lokální eventy do `mixAudioLayers` (bez auto planneru),
- diagnostika `musicUsed` / `ambientUsed` / `sfxCount`.

## 10. Cleanup pravidla

Po úspěchu:

- smazány stažené klipy, beds, mixed WAV,
- **ponechány** `output.mp4` + `thumbnail.png`,
- `cleanupIntermediates()` — idempotentní,
- `cleanupAll()` — smaže workdir včetně finálů (po uploadu callera).

Po chybě: `cleanupAll()` workdir.

Caller-owned VO/SRT/SFX cesty se nemažou.

## 11. Výsledky FFmpeg testu

`npm run check:video-reel-orchestrator` — **passed**

Ověřeno: legacy schema, normalize clip, ready/not_ready, invalid identity, duplicates, traversal, multi-download, too large, no-video file, audio declare true/false, full reel s music/ambient/SFX/subs/thumb/duration, cleanup success/error, finals ownership, no network.

## 12. Současná produkční cesta

- `jobRunner` beze změny (orchestrátor neimportován),
- still → zoompan default beze změny,
- `check:audio-mix`, `check:video-clip-render`, `check:video-sync`, `check:end-silence` — viz chat výsledky.

## 13. Neimplementováno

- napojení do `jobRunner` / feature flag,
- Runway generace / task tabulka,
- smíšený still+clip render,
- n8n / admin UI / Canvas,
- DB migrace,
- automatický SFX planner,
- music katalog / provider.

## 14. Síť / placené AI

Nulová síťová a placená volání. Downloader = lokální fixture copy. Žádný Runway / OpenAI / ElevenLabs.
