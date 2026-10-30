import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Supabase (API, storage, realtime) and the media bucket. The project URL is always allowed, whatever the env says.
const SUPABASE_ORIGINS = [...new Set(["https://pmuryumfyekjwqntcypo.supabase.co", process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")])]
  .filter((u): u is string => !!u && u.startsWith("https://"));
const SUPABASE = SUPABASE_ORIGINS.join(" ");
const SUPABASE_WS = SUPABASE_ORIGINS.map((u) => u.replace(/^https:/, "wss:")).join(" ");
const MEDIA = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://media.dayoneproject.xyz").replace(/\/+$/, "");

/**
 * Next.js inlines its bootstrap scripts and styles (no nonces here), so inline is allowed; dev adds eval and the
 * HMR websocket. frameAncestors: 'none' for signed-in areas, 'self' for public event pages.
 */
function contentSecurityPolicy(frameAncestors: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${SUPABASE} ${MEDIA} https://cdn.openart.ai https://images.unsplash.com`,
    `media-src 'self' data: blob: ${SUPABASE} ${MEDIA}`,
    `connect-src 'self' data: blob: ${SUPABASE} ${SUPABASE_WS}${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy("'self'") },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Signed-in areas are never framed (the later entry wins for the same header).
        source: "/:area(dashboard|admin|desk|login)/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy("'none'") },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
