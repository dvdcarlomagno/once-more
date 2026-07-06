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
| **Ambassador (host)** | Signs in with an email magic link, creates an event (or imports one from a Luma URL), sets shots-per-person, film filter, and watermark. Shares the QR code / event code. Hits "Reveal" when the moment is right. |
| **Participant** | Scans the QR (or enters the event code on the home page), types a name (no account), shoots their frames through the viewfinder, watches the blurred roll fill up, and downloads everything after the reveal. |

### The rules of the game

- Shots are limited per person (host-configurable, default 5).
- Photos can only be taken through the in-app camera — no gallery uploads.
- Everything stays blurred (server-enforced, not CSS) until the host reveals.
- The film filter (grain + warm tones + vignette) is baked in at reveal time.
- Watermark PNG (semi-transparent, bottom-right) is applied to all downloads,
  both individual saves and the full-event zip.

## Stack

- [Next.js](https://nextjs.org) (App Router) + Tailwind CSS v4
- [Neon](https://neon.tech) — serverless Postgres
- [Drizzle ORM](https://orm.drizzle.team) — schema + type-safe queries + migrations
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — photo & watermark storage
- [Auth.js](https://authjs.dev) (NextAuth v5) — host magic-link sign-in
- [sharp](https://sharp.pixelplumbing.com) — server-side blur, film filter, watermark
- Runs on free tiers: Vercel Hobby + Neon free + Vercel Blob free

## Setup

### 1. Database (Neon)

1. Create a free Postgres project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string into `DATABASE_URL` (see below).
3. Apply the schema:

```bash
npm run db:migrate      # runs the generated SQL in drizzle/ against DATABASE_URL
# or, to push the schema directly without migration files:
npm run db:push
```

### 2. Storage (Vercel Blob)

In your Vercel project, create a **Blob** store (Storage tab). Copy its
`BLOB_READ_WRITE_TOKEN`, or run `vercel env pull .env.local` to fetch it.

### 3. Environment

```bash
cp .env.example .env.local
```

| Variable | What it is |
|----------|------------|
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store read/write token |
| `AUTH_SECRET` | Auth.js secret — generate with `npx auth secret` |
| `EMAIL_SERVER` | SMTP URL for magic-link emails (optional in dev) |
| `EMAIL_FROM` | From address for magic-link emails |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployment (used in QR codes) |

> **Zero-config dev login:** if `EMAIL_SERVER` is empty, magic-link URLs are
> printed to the server console instead of emailed — click the logged link to
> sign in locally without any email provider.

### 4. Run

```bash
npm install
npm run dev
```

> Camera note: `getUserMedia` requires HTTPS (or `localhost`). To test the
> camera from a phone on your LAN, use a tunnel like `ngrok` or deploy a
> preview.

### 5. Deploy

Push to GitHub, import into [Vercel](https://vercel.com/new), attach a Neon
Postgres integration and a Blob store, add the env vars, and deploy. Set
`NEXT_PUBLIC_SITE_URL` to the production URL so QR codes point at the right
place, and add the production URL to your email provider if you use one.

## Architecture notes

- **Blur is enforced server-side.** Blob URLs are never handed to the browser —
  every image is proxied through `/api/photos/[id]/image`, which pre-reveal
  will only ever return a tiny, destructively blurred thumbnail. Originals are
  read server-side only.
- **Reveal is lazy.** Flipping the switch marks the event revealed; each
  photo's developed version (film filter baked in) is processed on first
  request and cached back to Blob storage.
- **Participants are cookie-scoped.** Joining creates a row with a random
  token stored in an httpOnly cookie — enough identity for shot limits without
  accounts.
- **Shot limits are checked server-side** on every upload.
- **Host auth uses JWT sessions** so the edge middleware (`src/proxy.ts`) can
  gate `/dashboard` without a database round-trip; the Drizzle adapter only
  stores users and magic-link verification tokens.
- **Data access is ownership-checked in code** (every host query filters by
  `ambassadorId`), and participant/photo access goes through server routes.

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
