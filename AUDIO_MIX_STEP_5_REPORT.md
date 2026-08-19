# AUDIO_MIX_STEP_5_REPORT

Datum: 2026-08-15

## 1. Implementovaný audio kontrakt

Samostatná renderovací vrstva (bez providerů / cen / Runway / DB):

| Vrstva | Typ | Poznámka |
| --- | --- | --- |
| Voiceover | povinný `path`, volitelný `gain` | začátek t=0, hlavní priorita |
| Scene audio | `sceneId`, `path` (video nebo audio), `enabled?`, `gain?`, `startSeconds?`, `durationSeconds?` | default start z xfade timeline |
| Music | volitelný bed: `path`, `gain?`, `loop?`, fade in/out | |
| Ambient | stejně jako music | |
| SFX | pole `{ path, startSeconds, gain? }` | více efektů na přesné časy |

Hlavní API: `mixAudioLayers(input) → { audioPath, durationSeconds, sampleRate, channels, diagnostics }`

Soubory kontraktu: `video-worker/services/audioMix/types.ts`, `defaults.ts`.

## 2. Změněné soubory

| Soubor | Změna |
| --- | --- |
| `lib/video-engine/xfadeTimeline.ts` | **nový** — společná xfade timeline matematika |
| `video-worker/services/audioMix/defaults.ts` | **nový** — centrální úrovně |
| `video-worker/services/audioMix/types.ts` | **nový** — kontrakt |
| `video-worker/services/audioMix/mixAudioLayers.ts` | **nový** — FFmpeg mixer |
| `video-worker/services/audioMix/index.ts` | **nový** — re-export |
| `video-worker/services/ffmpeg.ts` | `computeXfadeTimelineSeconds` → sdílený helper |
| `video-worker/services/ffmpegVideoClips.ts` | `computeVideoClipXfadeOffsets` → sdílený helper |
| `scripts/check-audio-mix.ts` | **nový** — reálné FFmpeg/ffprobe testy |
| `package.json` | `check:audio-mix` |
| `AUDIO_MIX_STEP_5_REPORT.md` | **nový** — tento report |

Produkční `mixSfx.ts` / `programmaticSfx.ts` / `jobRunner.ts` **nezměněny** v chování (jobRunner mixer neimportuje).

## 3. Timeline a umístění scene audia

`computeXfadeSceneTimeline` (sdílené s video vrstvou):

- scéna 0: start = 0  
- scéna i: start = cumulative − min(transitionSeconds, durationᵢ/2)  
- `timelineSeconds` = výsledná vizuální délka po overlapech  

Scene audio:

- start = xfade start scény (ne prostý součet délek),
- trim na délku scény,
- kratší audio se neprodlužuje,
- video bez audio stopy → skip bez chyby.

Příklad (4 + 3 + 4, transition 0.4): starty 0 / 3.6 / 6.2; total 10.2 s.

## 4. Výchozí úrovně

Centrálně v `AUDIO_MIX_DEFAULTS`:

| Vrstva | Gain |
| --- | --- |
| voiceover | 1.00 |
| scene audio | 0.22 |
| music | 0.12 |
| ambient | 0.08 |
| SFX | 0.22 |

Fade: music in 0.5 s / out 1.5 s; ambient in 0.3 s / out 1.0 s.  
Sample rate 44100, stereo.

## 5. Ducking

- Spojitá beds (scene + music + ambient) → `sidechaincompress` s klíčem z voiceoveru.
- Parametry: threshold 0.05, ratio 6, attack 20 ms, release 280 ms.
- SFX **nejsou** sidechain-ducknuté (krátké akcenty zůstávají slyšitelné), jen gain-capped a ve finálním `amix` s nižší váhou než VO.

## 6. Ochrana proti clippingu

Finální `alimiter` (limit 0.95, attack 5 ms, release 50 ms) po smíchání všech vrstev.  
Test: `volumedetect` max_volume ≤ 0 dBFS.

## 7. Music a ambient

- Volitelné.
- Default `loop: true` přes `-stream_loop -1`.
- `atrim` na `targetDurationSeconds`.
- `afade` in/out — konec nepadá náhle.
- Delší bed se ořízne trimeem.

## 8. SFX

- Existující `writeProgrammaticSfxWav` / `maybeMixVoiceWithSfx` zůstávají produkční cestou.
- Nový mixer přijímá libovolné lokální SFX soubory na `startSeconds`.
- Integrační test ověřil, že produkční `maybeMixVoiceWithSfx` stále funguje.

## 9. Výstupní audio formát

- Mezivýstup: **WAV PCM s16le**, 44100 Hz, stereo (bez zbytečné lossy re-komprese před video muxem).
- Délka = `targetDurationSeconds` (`-t` + trim/pad).
- `renderVideoClipsMp4` přijme tento soubor jako `audioPath` a muxuje do AAC ve finálním MP4.

## 10. Výsledky FFmpeg/ffprobe testů

`npm run check:audio-mix` — **passed**

1. pouze VO  
2. VO + scene audio  
3. VO + music  
4. VO + ambient  
5. VO + více SFX  
6. všechny vrstvy  
7. klip bez audia → skip  
8. scene audio offsety (xfade)  
9. trim scény  
10. music loop  
11. music fade-out  
12–13. délka + 44100 stereo  
14. bez clipu  
15. VO měřitelný / nepřehlušený  
16–17. mix → `renderVideoClipsMp4` → MP4 s očekávanou délkou  
18. produkční SFX mix OK  
19. žádná síť / placené AI  

## 11. Integrace s video-clip renderem

Ověřeno v testu: lokální klipy + mix (VO/scene/music/ambient/SFX) → `renderVideoClipsMp4` → finální MP4; video i audio duration ≈ target; VO pásmo přítomné.

## 12. Produkční pipeline

- `jobRunner.ts` **nevolá** `mixAudioLayers`.
- Still-image default a stávající `maybeMixVoiceWithSfx` beze změny.
- Žádný feature flag v tomto kroku.

## 13. Zatím neimplementováno

- napojení do `jobRunner` / produkce  
- Runway / placené API  
- DB / UI / Canvas  
- automatický výběr hudby z katalogu  
- AI mastering  
- míchání scene audio přímo uvnitř video filtergraphu (místo pre-mix stem)

## 14. Síť / placené AI

Nulová síťová a placená AI volání. Fixtures = lokální lavfi / programmatic SFX.  
TypeScript `tsc --noEmit` a eslint změněných souborů — viz chat výsledky běhu kontroly.
