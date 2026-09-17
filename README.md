# Ett halvår i Sverige — a semester in Sweden

A small, personal photo journal from an exchange semester in Stockholm. The
homepage is a reverse-chronological **timeline** of short, frequent entries — a
photo and two sentences is a normal entry; a long essay is the rare one.

It's a keepsake first and an easy way for friends and family to follow along
second: no app, no account to read it, no social network, no tracking. The
owner can sign in to **write, edit, and delete entries directly in the browser**.

## The one idea: Daylight

Stockholm daylight swings from just over 6 hours in December to more than 18½ at midsummer.
Every entry is tinted by how much daylight Stockholm **actually had** on its date
(computed from real sunrise/sunset). Winter entries render in deep petrol‑black;
summer entries bleach toward birch‑white, and the page changes character as you
scroll the semester. Each entry shows a small daylight gauge with its sunrise and
sunset. The reading surface always stays a solid, contrast‑checked panel, so the
mood never costs you legibility. The editor even previews the Daylight of the
date you pick.

## Stack

- **Frontend:** Vue 3 (`<script setup>`) + TypeScript (strict) + Vite, Vue Router,
  Tailwind CSS v4, two self‑hosted variable fonts (**Fraunces** display, **Inter**
  body).
- **Backend:** Node + Express, **SQLite** (better‑sqlite3), single‑admin auth
  (bcrypt + httpOnly JWT cookie), photo upload with `sharp` resizing, and
  server‑side Open Graph rendering.

## Decisions (surfaced, not guessed)

| Decision | Choice |
| --- | --- |
| Interface language | **English** (entries themselves can be any language) |
| Deployment target | **Docker Compose** (Node server serves API + site) |
| Unlisted entries | **Supported** — shareable by link, hidden from the timeline |
| Login + editing | **Added on request** — full backend with accounts + a database |

> **Note on the login.** The original brief scoped this as a static, no‑backend
> keepsake. Editable content that actually persists — and a login that actually
> protects anything — requires a server and a database, so this project now
> includes both. If you want the pure static version instead, the git history
> before the backend was added builds a static site served by nginx.

---

## Quick start (development)

```bash
npm install

# Create the admin account (needed once, stored in ./data/sweden-blog.db):
ADMIN_USERNAME=you ADMIN_PASSWORD=your-password npm run seed:admin

# Run the API (Node, :3000) and the Vite dev server (:5173) together:
npm run dev:full
```

Open <http://localhost:5173>. The first run seeds the example entries from
`content/entries/` into the database.

- Sign in at <http://localhost:5173/login>. Once in, you get **＋ New**,
  **Edit**, and **Delete** controls.
- The dev API listens on **:5178** and the Vite dev server proxies to it. To use
  a different API port: `PORT=4000 npm run dev:server` and
  `API_PROXY=http://localhost:4000 npm run dev`.

Other scripts:

```bash
npm run build       # type-check + build the frontend into dist/
npm run start       # run the production server (serves dist/ + API)
npm run typecheck   # vue-tsc, no emit
npm run photos      # regenerate the committed example images (see below)
```

---

## Writing: add / edit / delete an entry

Two ways, both first‑class:

### In the browser (the everyday way)

Sign in and click **＋ New** (or **Edit** on any entry). The editor has fields for
date (required), title, location, tags, an Unlisted toggle, a Markdown body, and
photo uploads. Photos you drop in are resized to WebP automatically; each one
needs alt text before you can save. Changes are saved to the database and appear
immediately.

- **Unlisted** entries are reachable and shareable by their direct link but never
  appear on the timeline, tags, or sitemap — handy for something just for family.
- Permalinks (`/entry/<date>-<title>`) stay stable when you edit, so a link you
  shared keeps working.

### Seeding from Markdown files

On first boot, every file in `content/entries/*.md` is imported into the
database. This is how the example content gets there, and it's a convenient way
to bulk‑author offline. Frontmatter shape:

```markdown
---
date: 2026-03-22            # required, YYYY-MM-DD
title: "Out to the islands" # optional
location: "Södermalm"       # optional
tags: [travel, everyday]    # optional
unlisted: false             # optional, default false
photos:
  - src: ferry-wake         # base filename in /public/photos (no extension)
    alt: "The white wake of a ferry across cold grey water."  # required
    caption: "Free with the tram card."                       # optional
---

Body text in **Markdown**. May be empty if the entry is just photos.
```

Seeding runs **only when the database is empty**. After that, the database is the
source of truth (so your in‑browser edits aren't overwritten on restart). To
re‑seed from scratch in development, delete `./data/` and restart.

## Adding photos

- **In the editor:** just upload — originals are resized to capped WebP variants
  (400 / 800 / 1200 / 1600px) on the server and stored in the data volume.
- **For Markdown‑seeded example photos:** drop an original into `photos-src/`, run
  `npm run photos` (uses `sharp` to generate `public/photos/<name>-<w>.webp` and
  record dimensions in `src/content/photos.manifest.json`), then reference the
  photo by its base name. Commit the generated files so a clean clone has images.

Either way, the app always renders responsive `srcset` with explicit
`width`/`height` (no layout shift), lazy‑loads below the fold, and shows captions
as real, selectable text.

---

## Deployment (Docker Compose)

The container runs the Node server, which serves the built frontend, the API,
uploaded photos, and per‑entry Open Graph tags. A named volume persists the
SQLite database and uploaded photos.

```bash
cp .env.example .env        # then edit it (see below)
docker compose up --build -d
```

The site is at <http://localhost:8080> (host port set by `PORT`).

`.env` values:

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | **Required.** Signs session cookies. `openssl rand -hex 32`. |
| `SITE_URL` | Your real public URL — makes OG image links absolute for shared previews. |
| `PORT` | Host port to expose (container listens on 3000). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeds the admin on first boot (only if no user exists). |

You can also manage the admin after deploy:

```bash
docker compose exec web node server/seed-admin.mjs <username> <password>
```

### Why the server (Open Graph)

A link pasted into a family chat should show the photo and first line. A static
SPA can't produce per‑page tags, so the Node server renders each `/entry/<slug>`
request's `<title>` and Open Graph tags on the fly, with `SITE_URL` making the
image URLs absolute.

### Deploying elsewhere

Any host that can run a Node process works: `npm ci`, `npm run build`,
`SESSION_SECRET=… SITE_URL=… npm run start`. Put a reverse proxy (TLS) in front,
and give `./data` durable storage.

---

## How it fits together

```
content/entries/        Markdown entries — imported into the DB on first boot
photos-src/             Originals for the example images (input to npm run photos)
public/photos/          Generated example WebP (committed, served at /photos)
server/                 Express API, SQLite, auth, photo upload, SSR Open Graph
  index.mjs             App wiring: API + static + SSR + SPA fallback
  db.mjs                Schema, seeding, queries
  auth.mjs              bcrypt login, JWT cookie, CSRF guard
  entries.mjs           Entries CRUD (mutations require auth)
  photos.mjs            Upload + sharp resize
  render.mjs            Per-entry Open Graph + sitemap
src/
  api/client.ts         Typed fetch wrapper (sends the CSRF header)
  content/store.ts      Reactive store; adapts API entries -> Daylight-aware Entry
  content/mutations.ts  create / update / delete + store refresh
  stores/auth.ts        Session state, login/logout
  lib/daylight.ts       Sunrise/sunset -> per-entry palette (the signature idea)
  components/ pages/     Timeline, Entry, About, Tag, 404, Login, Editor
data/                   SQLite DB + uploaded photos (gitignored; a volume in Docker)
Dockerfile, docker-compose.yml, .env.example
```

## Security notes

- Passwords are bcrypt‑hashed; the session is a signed, httpOnly, SameSite=Lax
  cookie. Only the single admin can mutate content.
- **CSRF:** every mutating request must carry an `X-Requested-With: fetch` header,
  which a cross‑site page can't set without a CORS preflight the server never
  grants. Run behind HTTPS in production (the cookie is marked `secure` there).
- Nothing about readers is tracked or stored.

## Craft notes

- **Accessibility first.** Body text ≥17px with AA contrast on its actual
  background; keyboard navigation with a designed focus style; a skip link;
  meaningful `alt` required on every image; captions as real text. Verified
  mobile‑first at a narrow width with no horizontal scroll.
- **Motion with restraint.** Entries reveal as they enter the viewport and photos
  drift a few pixels against the scroll — all disabled under
  `prefers-reduced-motion: reduce`.
- **Performance.** Responsive WebP `srcset` with explicit dimensions, lazy‑loading,
  self‑hosted fonts, and no Markdown/YAML parser shipped to the browser.

## Out of scope (still)

No comments, likes, analytics, newsletter, or cookie banner — nothing about
readers is tracked. The only account is the owner's, for editing.
