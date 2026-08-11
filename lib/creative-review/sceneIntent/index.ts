/**
 * Scene Creative Intent seeding / generation boundary.
 *
 * Public entry: generateSceneCreativeIntents (AI) + seed helpers.
 */
export {
  seedSceneIntentsForCreativeReview,
  seedSceneIntentsFromPackage,
  collectSceneIntentConversionSources,
  collectSceneIntentConversionSourcesFromPackage,
  type SceneIntentSeedInput,
  type SceneIntentConversionSource,
} from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";

export {
  generateSceneCreativeIntents,
} from "@/lib/creative-review/sceneIntent/generateSceneIntents";
