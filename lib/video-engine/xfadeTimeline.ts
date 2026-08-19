/**
 * Shared xfade timeline math for video clips and audio mix.
 * Scene starts account for transition overlaps (not a plain sum of durations).
 */

export interface XfadeTimelineSceneInput {
  sceneId: string;
  durationSeconds: number;
}

export interface XfadeTimelineSceneEntry {
  sceneId: string;
  index: number;
  /** When this scene begins on the joined timeline (xfade offset for i > 0). */
  startSeconds: number;
  durationSeconds: number;
  /** startSeconds + durationSeconds (may overlap the next scene during xfade). */
  endSeconds: number;
  /** Incoming transition length; 0 for the first scene. */
  incomingTransitionDurationSeconds: number;
}

export interface XfadeSceneTimeline {
  scenes: XfadeTimelineSceneEntry[];
  /** Total visual length after xfade overlaps. */
  timelineSeconds: number;
}

/**
 * Computes per-scene start/end times using the same cumulative math as
 * FFmpeg `xfade` offset chaining in the still and video-clip renderers.
 */
export function computeXfadeSceneTimeline(
  scenes: XfadeTimelineSceneInput[],
  transitionSeconds: number,
): XfadeSceneTimeline {
  if (scenes.length === 0) {
    return { scenes: [], timelineSeconds: 0 };
  }

  const entries: XfadeTimelineSceneEntry[] = [];
  let cumulative = scenes[0]!.durationSeconds;
  entries.push({
    sceneId: scenes[0]!.sceneId,
    index: 0,
    startSeconds: 0,
    durationSeconds: scenes[0]!.durationSeconds,
    endSeconds: scenes[0]!.durationSeconds,
    incomingTransitionDurationSeconds: 0,
  });

  for (let i = 1; i < scenes.length; i++) {
    const duration = scenes[i]!.durationSeconds;
    const td = Math.min(transitionSeconds, duration / 2);
    const start = Math.max(0, cumulative - td);
    cumulative = start + duration;
    entries.push({
      sceneId: scenes[i]!.sceneId,
      index: i,
      startSeconds: start,
      durationSeconds: duration,
      endSeconds: start + duration,
      incomingTransitionDurationSeconds: td,
    });
  }

  return { scenes: entries, timelineSeconds: cumulative };
}

/** Total xfade timeline length (seconds). */
export function computeXfadeTimelineLengthSeconds(
  scenes: Array<{ durationSeconds: number }>,
  transitionSeconds: number,
): number {
  return computeXfadeSceneTimeline(
    scenes.map((s, i) => ({
      sceneId: `scene-${i}`,
      durationSeconds: s.durationSeconds,
    })),
    transitionSeconds,
  ).timelineSeconds;
}
