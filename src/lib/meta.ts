import type { Metadata } from "next";

/**
 * Canonical URL for a page.
 *
 * There is no `<link rel="alternate" type="text/markdown">` here on purpose.
 * That tag exists to point at a separate Markdown address, and this site does
 * not have one: Markdown is served from the page's own URL under
 * `Accept: text/markdown` by src/middleware.ts. One piece of
 * content, one address.
 */
export function pageMeta(path: string): Pick<Metadata, "alternates"> {
  return { alternates: { canonical: path } };
}
