import type { NextConfig } from "next";

const markdownFile = [
  { key: "Content-Type", value: "text/markdown; charset=utf-8" },
  { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  images: {
    qualities: [84],
    unoptimized: true,
  },
  // Every internal href is written with a trailing slash, matching the sister
  // site customercare.om. Without this each link would cost a 308 redirect.
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Exact paths, so no glob support is needed. Static files in public/ would
  // otherwise get a content type guessed from their extension.
  async headers() {
    return [
      // Pages can also be served as Markdown by src/middleware.ts, so caches
      // must key on Accept. Next.js drops a Vary set in middleware.
      {
        source: "/((?!_next/|api/|hero/|teasers/|.*\\.[a-zA-Z0-9]+$).*)",
        headers: [{ key: "Vary", value: "Accept" }],
      },
      {
        source: "/blog/feed.xml",
        headers: [
          { key: "Content-Type", value: "application/rss+xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      { source: "/llms.txt", headers: markdownFile },
      { source: "/llms-full.txt", headers: markdownFile },
      {
        source: "/robots.txt",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Content-Type", value: "application/xml; charset=utf-8" }],
      },
      {
        source: "/site.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;
