import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Asset uploads go through a Server Action; the default 1 MB body limit is
    // too small for real images/videos. Raised so Phase 2A uploads work.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
