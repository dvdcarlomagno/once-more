# once more

A shared disposable camera for community events — built for (and by) Cursor
ambassadors, open to everyone.

Hand every guest a virtual film camera: they scan a QR code, get a handful of
frames, and shoot through a small DSLR-style viewfinder. No previews, no
retakes. Every photo lands **blurred** in the event's shared roll, and nobody —
not even the person who took it — sees it clearly until the host **reveals**
the whole roll. Optionally, a grainy warm film filter gets baked into every
photo at reveal, and a custom watermark is stamped on downloads.

## How it works

| Role | Experience |
|------|-----------|
| **Ambassador (host)** | Signs in with an email magic link, creates an event (or imports one from a Luma URL), sets shots-per-person, film filter, and watermark. Shares the QR code. Hits "Reveal" when the moment is right. |
| **Participant** | Scans the QR, types a name (no account), shoots their frames through the viewfinder, watches the blurred roll fill up, and downloads everything after the reveal. |

### The rules of the game

- Shots are limited per person (host-configurable, default 5).
- Photos can only be taken through the in-app camera — no gallery uploads.
- Everything stays blurred (server-enforced, not CSS) until the host reveals.
- The film filter (grain + warm tones + vignette) is baked in at reveal time.
- Watermark PNG (semi-transparent, bottom-right) is applied to all downloads,
  both individual saves and the full-event zip.

## Stack

- [Next.js](https://nextjs.org) (App Router) + Tailwind CSS v4
- [Supabase](https://supabase.com) — Auth (magic links), Postgres, Storage
- [sharp](https://sharp.pixelplumbing.com) — server-side blur, film filter, watermark
- Deployable on Vercel's free Hobby tier + Supabase's free tier

## Setup

### 1. Supabase project

1. Create a project at [database.new](https://database.new).
2. Run the SQL in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the SQL editor (creates tables, RLS policies, and the two private
   storage buckets).
3. In **Auth → URL Configuration**, set your site URL and add
   `https://your-domain/auth/confirm` to the redirect allow-list
   (plus `http://localhost:3000/auth/confirm` for local dev).

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase dashboard (Settings → API keys):

| Variable | What it is |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (or legacy anon) key |
| `SUPABASE_SECRET_KEY` | Secret (or legacy service_role) key — server only |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployment (used in QR codes) |

### 3. Run

```bash
npm install
npm run dev
```

> Camera note: `getUserMedia` requires HTTPS (or `localhost`). To test the
> camera from a phone on your LAN, use a tunnel like `ngrok` or deploy a
> preview.

### 4. Deploy

Push to GitHub, import into [Vercel](https://vercel.com/new), add the same
environment variables, deploy. Set `NEXT_PUBLIC_SITE_URL` to the production
URL so QR codes and magic links point at the right place.

## Architecture notes

- **Blur is enforced server-side.** Originals live in a private bucket and are
  only ever read by route handlers using the secret key. Pre-reveal, the only
  image the API will serve is a tiny, destructively blurred thumbnail.
- **Reveal is lazy.** Flipping the switch marks the event revealed; each
  photo's developed version (film filter baked in) is processed on first
  request and cached back to storage.
- **Participants are cookie-scoped.** Joining creates a row with a random
  token stored in an httpOnly cookie — enough identity for shot limits without
  accounts.
- **Shot limits are checked server-side** on every upload.

## Roadmap

- [ ] Full Luma API integration (guest lists, check-ins)
- [ ] Per-photo filter editing
- [ ] Realtime gallery updates during the event
- [ ] Multiple film presets to choose from
- [ ] Photo moderation tools for hosts (delete single frames)
- [ ] i18n

## Contributing

This is an MVP meant to be improved by the ambassador community. Issues and
PRs welcome — keep it simple, keep it free-tier friendly.

## License

[MIT](LICENSE)
