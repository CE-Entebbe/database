# CE Membership

Church membership app for CE Entebbe: churches, PCFs (Pastoral Care Fellowships), cells, members and leadership roles.
Runs on **Cloudflare Workers + D1**, written in TypeScript with [Hono](https://hono.dev). The UI is server-rendered, mobile-first and has no build step.

## Purpose
The app collects member details so the church can send e-cards for **birthdays** and **wedding anniversaries**. It also serves as the church member database.

## Member accounts (`/`)
- Members create an account with title (Brother, Sister, Pastor, Deacon, Deaconess or None), first and last name, phone, optional email, date of birth, church, optional cell and a password. Cards show the title plus first name, e.g. "Sister Grace".
- Members log in with their phone or email and password. Sessions use an HMAC-signed, HttpOnly cookie that lasts 30 days. Changing the password signs out every other session.
- **Profile:** edit details and pick a cell (only when the Cells feature is on).
- **Family:**
  - A Married toggle shows the wedding anniversary date and a spouse (title, name, date of birth).
  - A "Do you have kids?" toggle lets members add children (name and date of birth, no title).
  - Switching back to Single removes the spouse, their photos and the anniversary.
- **Photos:** a gallery for the member, their spouse and each child. Photos are resized on the phone to at most 1600 px, stored in R2 and wait for admin approval. Up to 60 photos per member, JPEG/PNG/WebP, 2 MB maximum each.
- Duplicate phone numbers and emails are rejected. Phones are stored as digits with the 256 country code.

## Admin (`/admin`)
- **Celebrate** (home tab): birthdays of members, spouses and children, plus wedding anniversaries, for Today, the next 7 days or This month, with an optional church filter. Each entry has a **Make e-card** button.
- **E-card:** a 1080×1080 PNG (square, good for WhatsApp) drawn in the browser. It shows the chosen approved photo (or initials), "Happy Birthday" or "Happy Wedding Anniversary", "Title First-name" (or "Brother John & Sister Mary" for couples), an editable blessing line and the church name. **Download PNG**, or **Share** through the Web Share API on phones.
- **Review:** a queue of uploaded photos to approve or reject. Only approved photos can be used on e-cards.
- **Members:** open any member to edit their details, family and photos. Members can also be added by the admin, without an account.
- Cells and PCFs, leaders and roles, churches and settings work as described below.
- *Planned for later:* AI-generated card artwork. `photos.source` already supports the value `'ai'`.

## Features
- **Churches**: one main church, with small churches under it.
- **PCFs and cells**: set up separately for each church. Each cell belongs to a PCF. Admins deactivate PCFs and cells instead of deleting them.
- **Members**: each member belongs to a church and can optionally pick a cell. Every member gets a private link (`/m/<code>`) to choose their cell.
- **Cells toggle** (global): when it is on, members see a dropdown of *active cells in their own church only*. The server returns only `id` and `name`, never PCFs or roles, and rejects any pick from another church or an inactive cell.
- **Leadership roles** (admin only): Coordinator, PCF Leader, Assistant PCF Leader, Cell Leader, Assistant Cell Leader, Bible Study Teacher. PCF roles need a PCF and cell roles need a cell, both in the member's church. Coordinators are linked to the small churches they cover.

## Admin access
Every `/admin` page and `/api/admin/*` route needs the `ADMIN_TOKEN` secret:
- **Browser:** open `/admin` and sign in with HTTP Basic auth. Use any username and enter the token as the password.
- **API:** send the header `Authorization: Bearer <ADMIN_TOKEN>`.

If `ADMIN_TOKEN` is not set, the admin routes return 503. Use a long random value, for example `openssl rand -hex 24`.

## Local development
```bash
npm install
printf 'ADMIN_TOKEN=dev-token\nSESSION_SECRET=dev-secret\n' > .dev.vars
npm run db:migrate:local
npm run dev            # http://localhost:8787/admin  (password: dev-token)
npm test               # vitest + miniflare (in-memory D1)
```

## Deploy
```bash
npx wrangler login
npx wrangler d1 create ce_membership       # copy the database_id it prints
#   -> paste it into wrangler.toml (database_id)
npm run db:migrate:remote
npx wrangler r2 bucket create ce-member-photos
npx wrangler secret put ADMIN_TOKEN        # paste a long random token
npx wrangler secret put SESSION_SECRET     # another long random value (signs member sessions)
npm run deploy
```
Then open `https://<worker>.workers.dev/admin`. Setup order: create the main church, then small churches, PCFs, cells and members. Switch on **Cells** in Settings and share each member's link (**Copy link**).

## API summary
Public: `GET /api/member/:code`, `PUT /api/member/:code/cell {cell_id|null}`, `GET|POST /m/:code`.

Admin (`/api/admin`): `GET|PUT /settings`; `GET|POST /churches`, `PATCH /churches/:id`; `GET|POST /pcfs`, `PATCH /pcfs/:id`;
`GET|POST /cells`, `PATCH /cells/:id`; `GET|POST /members`, `GET|PATCH|DELETE /members/:id`, `POST /members/:id/reset-code`;
`GET /roles`, `POST /members/:id/roles`, `DELETE /roles/:id`; `PUT /members/:id/coordinator-churches {church_ids:[]}`.
Lists accept a `?church_id=` filter. Send `{active:false}` with PATCH to deactivate.

## Layout
`src/index.ts` holds the routes and rules, `src/admin-page.ts` the admin UI, `src/member-page.ts` the member UI, `src/styles.ts` the design system, `migrations/` the D1 schema and `test/` the tests.
