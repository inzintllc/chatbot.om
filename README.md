# chatbot.om

Marketing site for chatbot.om, Oman's sovereign AI chatbot for websites and
WhatsApp. Next.js App Router, Tailwind v4, deployed on Vercel.

It is the sister site of [customercare.om](https://customercare.om) (the
`voxcare-static` repository). The two share a design system deliberately: the
token block at the top of `src/app/globals.css` is kept byte-identical with
that project's, so a palette or type change is applied to both by copying that
block across. Everything below the `Homepage` banner comment in that file is
specific to this site's landing page.

## Structure

```
src/app/          routes; collection pages read from src/data
src/data/         site.ts (nav, footer, metadata) + features, industries,
                  integrations, templates
src/components/   Header, Footer, sections.tsx (shared page furniture),
                  plus the homepage's scroll-driven sections
src/lib/          install-request email handling and utils
```

`src/data/site.ts` is the single source of truth for navigation, the footer,
contact details, and the sister-site link. Adding a product page means adding
it there and creating the route.

## Local setup

```bash
npm install
npm run dev
```

The local app runs at `http://localhost:3401` in both development and
production start modes.

Create `.env.local` from `.env.example` before testing the CTA email flow.

`npm run lint` runs ESLint and `tsc --noEmit`. `npm test` covers the
install-request email builder.

## AI readability

`npm run build` runs `scripts/ai-readability.mjs` after `next build`. It reads the
HTML Next prerenders into `.next/server/app` and writes, into `public/`:

- a Markdown twin per indexable page, at the same path plus `.md`
- `/llms.txt`, a curated index following the llmstxt.org shape
- `/llms-full.txt`, the whole site as one Markdown document

Those outputs are generated, so they are gitignored. Running `next build` on its
own will leave them stale; use `npm run build`, or `npm run ai:check` to
regenerate them against the current `.next`.

There is one public URL per page. Agents get Markdown from that same address:

```bash
curl -H "Accept: text/markdown" https://chatbot.om/product/smart-follow-ups/
```

Negotiation is handled by `src/middleware.ts`, which appends
`Vary: Accept` to both variants and sets the content type on the Markdown; `next.config.ts` sets it on
`llms.txt` and `llms-full.txt`. Pages with no twin fall through to HTML.

The `.md` files are the payload, not a second address: the middleware reaches
them through an internal fetch, and a direct request for one is redirected
`301` to the page it belongs to. There is deliberately no
`<link rel="alternate" type="text/markdown">`, because there is no separate
Markdown URL for it to point at.

`<link rel="canonical">` comes from `src/lib/meta.ts` via the Next Metadata API
rather than the post-build pass, because a server render leaves no HTML file to
patch. `pageMeta()`, the generator and the middleware all have to agree on
the twin mapping: `/about/` maps to `/about.md`, `/` maps to `/index.md`.

## Positioning

chatbot.om covers chat channels only: website chat, WhatsApp (including voice
notes), and email replies, plus tickets, follow-ups, the lead pipeline, and
reporting. Inbound phone calls, outbound calling campaigns, and the dedicated
AI Email Agent belong to customercare.om. `/comparison/` states the split
explicitly and should be kept in step with any capability change.

## Email CTA

The hero, the final CTA, and `/get-started/` post to `/api/install-request`.
The route uses SMTP settings and `CTA_OWNER_EMAILS` to email the owner with the
submitted website. Note that posting to it really does send mail, so avoid
exercising it against an environment that has live SMTP credentials.

## Deploy to Vercel

The project lives in the `inzintllc` Vercel account and deploys from
`inzintllc/chatbot.om` on GitHub: pushes to `main` go to production, other
branches get preview URLs. Vercel detects Next.js, so there is no `vercel.json`;
the build runs `npm run build` on Node.js 22. Response headers for the
discovery files live in `next.config.ts`.

The site is not a static export, because `/api/install-request` needs a
server. Vercel deploys the route as a serverless function.

Set these environment variables in **Project → Settings → Environment
Variables** for Production, Preview and Development:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
CTA_OWNER_EMAILS
NEXT_PUBLIC_APP_URL
```

`CTA_OWNER_EMAILS` accepts one address or a comma-separated list. Keep
`NEXT_PUBLIC_API_URL` unset so the form calls the same origin; only set
it when intentionally hosting the API on a different domain.

DNS for chatbot.om is on Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`,
set at the Ooredoo registrar). The zone also holds the Zoho Mail MX, SPF, DKIM
and verification records.

After deployment, submit the install form once and confirm that the function
logs show a successful request and that the owner email arrives.
