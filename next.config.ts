import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      // Ops media library accepts web-compressed MP4/WebM up to 80 MB plus multipart overhead.
      bodySizeLimit: "82mb",
    },
  },
};

export default nextConfig;
