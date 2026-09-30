# Deploying PolyBook

PolyBook is deployed as two independent projects from the same repository. Do
not use one project and flip its mode: separate projects keep the public
portfolio build independent from the database, wallet, session, and builder
credentials used by trading.

## Project 1: public portfolio

- Suggested project name: `poly-book`
- Production URL: `https://poly-book.vercel.app`
- Git branch: `main`
- Build command: `npm run build`
- Install command: `npm ci`
- Node.js: 24

`npm run build` runs the deployment preflight before Next.js. Portfolio mode
does not require trading credentials.

Environment:

```text
NEXT_PUBLIC_APP_MODE=portfolio
NEXT_PUBLIC_APP_URL=https://poly-book.vercel.app
```

Do not add database, JWT, Reown, or Polymarket builder credentials to this
project. After deployment:

```powershell
$env:SMOKE_BASE_URL='https://poly-book.vercel.app'
$env:SMOKE_EXPECT_MODE='portfolio'
npm run smoke
```

The smoke test requires `/` and `/terminal` to return 200 and requires the
profile and all private trading APIs to return 404.

## Project 2: trading

- Suggested project name: `poly-book-trading`
- Start with a Vercel preview/test domain; attach the final custom domain only
  after the release checklist passes.
- Git branch: the reviewed release branch, then `main` after approval
- Build command: `npm run build`
- Install command: `npm ci`
- Node.js: 24

Environment:

```text
NEXT_PUBLIC_APP_MODE=trading
NEXT_PUBLIC_APP_URL=https://<exact-trading-domain>
NEXT_PUBLIC_REOWN_PROJECT_ID=<reown-project-id>

DB_HOST=<mysql-host>
DB_PORT=3306
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_DATABASE=<mysql-database>
JWT_SECRET=<at-least-32-random-bytes>

POLY_BUILDER_API_KEY=<builder-key>
POLY_BUILDER_SECRET=<builder-secret>
POLY_BUILDER_PASSPHRASE=<builder-passphrase>
```

`npm run build` refuses a trading build when any required value is missing. It
also requires an origin-only `NEXT_PUBLIC_APP_URL`, HTTPS outside local
development, a valid database port, and a `JWT_SECRET` of at least 32 bytes.
The preflight reports variable names only and never prints secret values.

`NEXT_PUBLIC_APP_URL` must exactly match the visible origin. It is embedded in
wallet metadata and in the EIP-4361 login message; a preview URL and a production
URL therefore need separate environment values and separate builds.

Apply every SQL file in `db/migrations` in numeric order before testing. Use a
database user limited to this database. Builder secrets must only exist as
server-side variables and must never use a `NEXT_PUBLIC_` prefix.

After deployment:

```powershell
$env:SMOKE_BASE_URL='https://<exact-trading-domain>'
$env:SMOKE_EXPECT_MODE='trading'
$env:SMOKE_CHECK_MARKET_DATA='1'
npm run smoke
```

The trading smoke test checks the public pages, profile availability, anonymous
session behavior, 401 protection on wallet data and builder signing, and live
market resolution. It does not sign a wallet message or submit an order; use the
release checklist for those steps.

## Release rule

Keep the trading project private or on its preview domain until
`TRADING_RELEASE_CHECKLIST.md` has a recorded passing run. A successful build is
not evidence that wallet authentication, relayer authorization, approvals, and
order submission work with the real deployment credentials.
