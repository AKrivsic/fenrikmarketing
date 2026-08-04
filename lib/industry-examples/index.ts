export type {
  IndustryExampleData,
  IndustryExampleDelivery,
  IndustryExamplePackage,
  IndustryExamplePackagePlatforms,
  IndustryExamplePlatform,
  IndustryExampleYoutubeOutput,
} from "@/lib/industry-examples/types";

export {
  INDUSTRY_PLATFORM_META,
  INDUSTRY_PLATFORM_ORDER,
} from "@/lib/industry-examples/types";

export { hvacExample } from "@/lib/industry-examples/hvac";
export { INDUSTRY_EXAMPLE_CATALOG } from "@/lib/industry-examples/catalog";
export {
  listAllowlistedIndustryExampleVideos,
  resolveAllowlistedIndustryExampleVideo,
} from "@/lib/industry-examples/allowlist";
export {
  INDUSTRY_EXAMPLE_VIDEO_API_PATH,
  industryExampleVideoUrl,
} from "@/lib/industry-examples/video-url";
