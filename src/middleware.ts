/**
 * Markdown content negotiation for AI agents.
 *
 * There is exactly one public URL per page. Ask for it as HTML and you get
 * HTML; ask for it as Markdown and you get Markdown:
 *
 *   curl -H "Accept: text/markdown" https://chatbot.om/product/smart-follow-ups/
 *
 * `scripts/ai-readability.mjs` writes a Markdown twin into `public/` for every
 * page, but those files are an implementation detail: they are the payload this
 * middleware serves, and any request that asks for one directly is redirected
 * to the canonical page. That keeps one address per piece of content, so there
 * is nothing to canonicalise away and nothing for an agent to cite by the wrong
 * name.
 *
 * Browsers send `text/html` and are unaffected. Both variants carry
 * `Vary: Accept` so caches never serve one where the other was asked for.
 */
import { NextResponse, type NextRequest } from "next/server";

const MARKDOWN = "text/markdown; charset=utf-8";

/**
 * Marks the middleware's own fetch of a twin, so that fetch is not redirected
 * back to the page. Anyone can send it; all it exposes is the same Markdown
 * that `Accept: text/markdown` already returns.
 */
const INTERNAL = "x-markdown-twin";

/**
 * True only when the client asked for Markdown at least as strongly as HTML.
 * A browser sending `text/html,...,*​/*;q=0.8` must never be given Markdown.
 */
function prefersMarkdown(accept: string): boolean {
  if (!accept.toLowerCase().includes("text/markdown")) return false;

  let markdown = -1;
  let html = -1;

  for (const entry of accept.split(",")) {
    const [rawType, ...params] = entry.trim().split(";");
    const type = rawType.trim().toLowerCase();

    let q = 1;
    for (const p of params) {
      const [k, v] = p.split("=").map((s) => s.trim().toLowerCase());
      if (k === "q") {
        const parsed = Number.parseFloat(v);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }

    if (type === "text/markdown") markdown = Math.max(markdown, q);
    else if (type === "text/html" || type === "application/xhtml+xml") {
      html = Math.max(html, q);
    }
  }

  return markdown > 0 && markdown >= html;
}

/** `/about/` -> `/about.md`, `/` -> `/index.md`. Null for asset requests. */
function twinFor(pathname: string): string | null {
  if (pathname === "/") return "/index.md";
  if (/\.[a-z0-9]+$/i.test(pathname)) return null;
  return `${pathname.replace(/\/+$/, "")}.md`;
}

/** The inverse: `/about.md` -> `/about/`, `/index.md` -> `/`. */
function pageFor(pathname: string): string {
  const stem = pathname.replace(/\.md$/i, "");
  return stem === "/index" ? "/" : `${stem}/`;
}

function addVary(headers: Headers): void {
  const existing = headers.get("vary");
  const parts = existing ? existing.split(",").map((s) => s.trim()) : [];
  if (!parts.some((p) => p.toLowerCase() === "accept")) parts.push("Accept");
  headers.set("vary", parts.join(", "));
}

function passThrough(): NextResponse {
  const response = NextResponse.next();
  addVary(response.headers);
  return response;
}

export async function middleware(request: NextRequest) {
  // Never touch form posts or anything else that changes state.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const { pathname, origin } = request.nextUrl;

  // Discovery files are Markdown despite the .txt extension the spec mandates.
  // Their content type comes from the headers in next.config.ts.
  if (pathname === "/llms.txt" || pathname === "/llms-full.txt") return passThrough();

  // A twin is not a public address. Anyone arriving at one gets sent to the
  // page it belongs to, so the content has a single canonical URL.
  if (pathname.endsWith(".md")) {
    if (request.headers.get(INTERNAL)) return NextResponse.next();
    return NextResponse.redirect(new URL(pageFor(pathname), origin), 301);
  }

  if (prefersMarkdown(request.headers.get("accept") ?? "")) {
    const twin = twinFor(pathname);
    if (twin) {
      const fetched = await fetch(new URL(twin, origin), {
        headers: { [INTERNAL]: "1" },
        redirect: "manual",
      });
      // Pages without a twin (error and utility routes) fall through to HTML.
      if (fetched.ok) {
        const headers = new Headers({ "content-type": MARKDOWN });
        const cacheControl = fetched.headers.get("cache-control");
        if (cacheControl) headers.set("cache-control", cacheControl);
        addVary(headers);
        return new NextResponse(request.method === "HEAD" ? null : fetched.body, {
          status: 200,
          headers,
        });
      }
    }
  }

  // Assets keep their own headers; pages advertise that they vary by Accept.
  return twinFor(pathname) ? passThrough() : NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|hero/|teasers/).*)"],
};
