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
 * `openLinks` is for the pages that show an organizer's pasted links (Live Screens: the output page, the switcher and
 * its editor): any https page may be framed, and pictures and videos may come from any https address. Scripts and
 * connections stay as strict as everywhere else, so a linked site can only be shown, never run code in the app.
 */
function contentSecurityPolicy(frameAncestors: string, openLinks = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${SUPABASE} ${MEDIA} https://cdn.openart.ai https://images.unsplash.com${openLinks ? " https:" : ""}`,
    `media-src 'self' data: blob: ${SUPABASE} ${MEDIA}${openLinks ? " https:" : ""}`,
    `connect-src 'self' data: blob: ${SUPABASE} ${SUPABASE_WS}${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    `frame-src 'self'${openLinks ? " https:" : ""}`,
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
          // The guest app's Shot camera records video with sound.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy("'self'") },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // The landing page and invitation form can be embedded on the organizer's own website (Overview → embed
        // code). Browsers obey frame-ancestors over X-Frame-Options, and these pages have no signed-in actions.
        source: "/events/:slug/:page(invitation)?",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy("*") }],
      },
      {
        // An uploaded landing page (Landing Page → Custom HTML). It is the organizer's own HTML, so it runs in a
        // sandbox with no access to the app (no cookies, storage or sign-in) and is not held to the app's script,
        // font and picture rules. The sandbox is part of this header, so the page cannot lift it.
        source: "/events/:slug/site",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-top-navigation-by-user-activation; " +
              "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors *",
          },
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
      {
        // Live Screens show pasted links (web pages, YouTube, pictures, videos). Only the pages that preview or play
        // them may load those; the rest of the dashboard keeps the strict policy above.
        source: "/screen",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy("'none'", true) },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/dashboard/events/:id",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy("'none'", true) },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/live/:screenId",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy("'self'", true) }],
      },
    ];
  },
};

export default nextConfig;
