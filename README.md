# MarketMinds Academy

A TanStack Start + Supabase project.

## Development

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev
```

The dev server runs on http://localhost:8080.

## Build

```sh
npm run build
```

The build outputs a Cloudflare Pages compatible bundle in `dist` via `nitro` (preset: `cloudflare-pages`). The `dist/_worker.js` folder handles SSR and deep links, so `/courses/seo-foundations`, `/pricing`, `/portal/entry`, and other direct URLs should not 404 on Cloudflare Pages.

## Deploy to Cloudflare Pages

1. Push to GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20`
4. Add environment variables (from `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
    - `VAPID_PUBLIC_KEY`
    - `VAPID_PRIVATE_KEY`
    - `VAPID_SUBJECT`
    - `NOTIFY_WEBHOOK_SECRET`
    - `SITE_SECRET_CODE`

Do not deploy only the static assets inside `dist/_build`; Cloudflare Pages must receive the whole `dist` folder so the worker can serve every route.

## Stack

- TanStack Start (React 19, Vite 7)
- Tailwind CSS v4
- Supabase (Postgres + Auth + Realtime + Storage)
