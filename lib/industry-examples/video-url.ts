/** Same-origin public proxy for industry-example MP4s. */
export const INDUSTRY_EXAMPLE_VIDEO_API_PATH = "/api/public/example-video";

export function industryExampleVideoUrl(videoJobId: string): string {
  return `${INDUSTRY_EXAMPLE_VIDEO_API_PATH}?job=${encodeURIComponent(videoJobId)}`;
}
