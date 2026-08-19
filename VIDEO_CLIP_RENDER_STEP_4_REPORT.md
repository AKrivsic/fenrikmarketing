# VIDEO_CLIP_RENDER_STEP_4_REPORT

Datum: 2026-08-15

## 1. Co bylo implementováno

Samostatná FFmpeg cesta pro sestavení vertikálního MP4 ze **skutečných lokálních video klipů**:

1. normalizace (cover-crop → 1080×1920 @ 30 fps, SAR 1, yuv420p),
2. deterministická délka scény (trim / hold last frame),
3. xfade přechody (stejná matematika jako still-image cesta),
4. společný voiceover jako audio master clock,
5. volitelný subtitle burn-in přes existující `buildSubtitleBurnArgs`,
6. faststart + kompatibilita s `generateThumbnail`.

Cesta **není** napojená do `jobRunner.ts`, n8n, Runway, DB ani admin UI. Produkční default zůstává `stills → zoompan → FFmpeg`.

## 2. Nové nebo změněné soubory

| Soubor | Změna |
| --- | --- |
| `lib/video-engine/videoClipScene.ts` | **nový** — minimální vstupní kontrakt scény |
| `video-worker/services/ffmpegVideoClips.ts` | **nový** — normalize / trim / freeze / xfade / VO / render |
| `video-worker/services/ffmpeg.ts` | export `runFfmpeg`, `applyFastStartMp4` (still logika beze změny chování) |
| `scripts/check-video-clip-render.ts` | **nový** — reálné lavfi + ffprobe integrační testy |
| `package.json` | script `check:video-clip-render` |
| `VIDEO_CLIP_RENDER_STEP_4_REPORT.md` | **nový** — tento report |

## 3. Vstupní kontrakt video scény

```ts
export interface VideoClipScene {
  sceneId: string;
  clipPath: string;
  durationSeconds: number;
  transition: TransitionType; // "fade" | "slide" | "push" | "none"
  sourceDurationSeconds?: number;
}
```

Umístění: `lib/video-engine/videoClipScene.ts` (render vrstva, ne Runway provider).

Render API:

```ts
renderVideoClipsMp4({
  scenes,
  audioPath,
  srtPath?,
  outputPath,
  audioDurationSeconds?,
  tailPadSeconds?,
  profile?, // default SHORT_PROFILE
  signal?,
})
```

## 4. Normalizace videa

Per-clip filter (`buildVideoClipNormalizeChain`):

- `scale=W:H:force_original_aspect_ratio=increase`
- `crop=W:H` (center crop — default bez letterbox/`pad`)
- `fps=30`, `setsar=1`, `format=yuv420p`, `setpts=PTS-STARTPTS`
- výchozí profil: 1080×1920, 30 fps (`SHORT_PROFILE`)

## 5. Kratší a delší klipy

| Situace | Chování |
| --- | --- |
| klip delší než scéna | `trim=duration=<scene>` |
| klip ≈ délka scény | `trim` na délku scény |
| klip kratší než scéna | `tpad=stop_mode=1` (clone last frame) + `trim` — **bez** smyčky a bez extreme `setpts` slowdown |

`sourceDurationSeconds` lze předat; jinak se probe-ne lokálně přes `ffprobe` (`probeAudioDurationSeconds` na format duration).

## 6. Audio scén

- Filtr bere pouze `[i:v]`.
- Mapuje se výhradně společný voiceover input.
- Klipové audio se nemíchá (ověřeno volumedetect: loud clip + silent VO → near silence).
- Pozdější scene-audio mix lze přidat bez změny tohoto kontraktu (samostatný krok).

## 7. Přechody

Stejná xfade logika jako `buildMultiBeatArgs`:

- offset = cumulative − transitionDuration
- `transitionDuration = min(profile.transitionSeconds, scene.duration / 2)`
- mapping přes `xfadeTransitionName` (`fade` / `slideleft` / `smoothleft`)
- první scéna: `transition: "none"` (xfade začíná od 2. scény)
- výsledná timeline délka = sum(scene) − (N−1)×overlap (ne „omylem“ kratší/delší kvůli overlap)

## 8. Voiceover a titulky

- VO: stejný model jako produkce — `apad` + explicitní `-t` na `audioDuration + tailPad`
- Titulky: druhý pass `buildSubtitleBurnArgs` (libass `subtitles` + stejný `force_style`)
- Thumbnail: existující `generateThumbnail` na výsledném MP4
- Žádné TTS / Whisper / síťové volání

Poznámka prostředí: výchozí Homebrew `ffmpeg` na tomto stroji **nemá** libass. Test automaticky preferuje `/usr/local/opt/ffmpeg-full/bin/ffmpeg` (nebo `FFMPEG_PATH`), jinak hlásí blocker — bez mocků.

## 9. Výsledky FFmpeg / ffprobe testu

Příkaz: `npm run check:video-clip-render` — **passed**

Ověřeno na skutečném MP4 (ne jen argv string):

1. spojení 3 video scén  
2. 1080×1920  
3. 30 fps  
4. H.264 + AAC  
5. společný VO přítomen (mean volume)  
6. audio klipů se nepoužije  
7. delší klip oříznut na timeline  
8. kratší klip → tpad hold  
9. horizontální vstup cover-crop bez deformace / letterbox  
10. xfade offsety 3.600 / 6.200  
11. délka ≈ audio master (`vo + TAIL_BUFFER`)  
12. titulky vypáleny (frame diff vs no-sub)  
13. thumbnail přes `generateThumbnail`  
14. still-image `buildMultiBeatArgs` stále funguje  
15. žádné síťové/placené volání  

## 10. Still-image cesta

- `renderMp4` / `buildMultiBeatArgs` / zoompan beze změny chování
- `check:video-sync` — 7 passed  
- `check:end-silence` — 11 passed  
- `check:video-stream-extension` — passed  
- v clip testu explicitní still render 1080×1920 @ 30 / H.264

## 11. Co zatím nebylo implementováno

- napojení do `jobRunner` / produkční pipeline  
- Runway download → clip render  
- scene audio / hudba / SFX mix  
- ambient, scoring, benchmark metadata  
- DB migrace / provider routing / admin UI  
- letterbox jako režim (cover-crop je default)

## 12. Produkční pipeline nepřepnutá

- `jobRunner.ts` neimportuje `ffmpegVideoClips` / `renderVideoClipsMp4`
- default zůstává: **stills → zoompan → FFmpeg**
- nová cesta je dostupná jen jako `renderVideoClipsMp4` pro pozdější napojení

## 13. Síť / placené AI

- Žádné Runway / OpenAI / TTS / Whisper volání
- Test fixtures = lokální lavfi + dočasný adresář (uklizený)
- TypeScript: `tsc --noEmit` OK  
- ESLint změněných souborů: OK  
