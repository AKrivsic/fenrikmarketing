// Barrel for the Video Engine data contracts. Import from here so consumers do
// not depend on the individual file layout.
export { sceneSchema, type Scene } from "./sceneSchema";
export { renderSchema, type RenderSpec } from "./renderSchema";
export {
  persistedSceneSchema,
  renderSpecOutputSchema,
  type PersistedScene,
  type RenderSpecOutput,
} from "./renderSchema";
export {
  durableStorageRefSchema,
  sceneVideoClipSchema,
  normalizeSceneVideoClip,
  type DurableStorageRef,
  type SceneVideoClip,
} from "./sceneVideoClipSchema";
export {
  workerPayloadSchema,
  type WorkerPayload,
} from "./workerPayloadSchema";
export {
  workerCallbackSchema,
  workerCallbackSuccessSchema,
  workerCallbackFailureSchema,
  type WorkerCallback,
  type WorkerCallbackSuccess,
  type WorkerCallbackFailure,
} from "./workerCallbackSchema";
export {
  parseVideoJobRenderOptions,
  videoRenderModeSchema,
  VIDEO_RENDER_MODE_STILL,
  VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
  type VideoRenderMode,
  type VideoJobRenderOptions,
} from "./videoJobRenderMode";
