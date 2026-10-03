import type { NextConfig } from "next";

// Ops media library accepts web-compressed MP4/WebM up to 80 MB plus multipart overhead.
// Nginx `client_max_body_size` must be at least this large (deploy/nginx/iceageexpeditions.conf).
const MEDIA_UPLOAD_BODY_LIMIT = "82mb";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: MEDIA_UPLOAD_BODY_LIMIT,
    },
    // proxy.ts matches /ops/*, so it buffers every ops Server Action body. Past this limit the
    // body is silently truncated (default 10 MB), which corrupts larger video uploads.
    proxyClientMaxBodySize: MEDIA_UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
