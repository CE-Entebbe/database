# CE Membership

Church membership app for CE Entebbe: churches, PCFs (Pastoral Care Fellowships), cells, members and leadership roles.
Runs on **Cloudflare Workers + D1**, written in TypeScript with [Hono](https://hono.dev). The UI is server-rendered, mobile-first and has no build step.

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
echo 'ADMIN_TOKEN=dev-token' > .dev.vars
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
npx wrangler secret put ADMIN_TOKEN        # paste a long random token
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
