# PolyBook

PolyBook is a focused scalping terminal for Polymarket fast crypto markets.

The project is designed around a narrow trading use case: fast BTC, ETH, SOL, and XRP prediction markets on 5 minute, 15 minute, and 60 minute timeframes. Instead of trying to become a generic Polymarket interface, PolyBook is built as a fast workspace for traders who need orderbooks, charts, position presets, and one-click order entry in one place.

## Core Idea

PolyBook is optimized for speed.

The main workflow is:

1. Open a fast crypto market.
2. Watch the Polymarket orderbook and reference crypto data.
3. Use preconfigured position settings from the profile.
4. Click directly on orderbook liquidity to stage or submit an order.
5. Manage multiple trading setups with workspace tabs.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- MySQL
- Reown AppKit / Wagmi
- Ethers
- Polymarket CLOB client
- Polymarket builder relayer client
- Lightweight Charts
- Railway deployment

## Main Application Areas

### Scalp Terminal

Path:

```text
src/app/(routes)/scalpTerminal/page.tsx
```

This is the main product surface.

It includes:

- workspace tabs for different trading setups;
- draggable and resizable chart/orderbook windows;
- window snapping to corners and workspace halves;
- workspace-only maximize mode;
- pinned windows that stay above the rest;
- Binance reference charts;
- Binance reference orderbooks;
- Polymarket fast market charts;
- Polymarket orderbooks;
- one-click order entry from the Polymarket orderbook;
- trading guards for size, spread, and liquidity.

### Profile

Path:

```text
src/app/(routes)/profile/page.tsx
```

The profile page contains user-facing account and trading configuration.

Current profile features:

- wallet/safe information;
- avatar handling;
- demo active markets and trade history layout;
- portfolio view;
- position settings view.

Position settings are especially important for the terminal. They define the default trading behavior before the user enters the orderbook:

- default order size;
- maximum order size;
- maximum position size;
- maximum spread;
- minimum side liquidity;
- quick sizes;
- post-only mode;
- one-click trading;
- explicit confirmation mode;
- enabled assets;
- enabled timeframes.

Shared trading settings are stored in:

```text
src/app/Components/tradingSettings.ts
```

### Header and Wallet Flow

Important files:

```text
src/app/Components/header.tsx
src/app/Components/CustomConnect.tsx
src/app/Components/DepositContent.tsx
src/app/Components/WithdrawContent.tsx
```

The header contains navigation, market price cards, theme switching, and wallet controls.

`CustomConnect.tsx` handles the main wallet flow and account state. It is also where Polymarket relayer helpers are exposed for Safe/deposit wallet handling.

## Trading Flow

The current trading path is built around the Polymarket CLOB client.

Orderbook data is loaded from:

```text
src/app/api/pol/orderbook/route.ts
```

The route resolves the active fast market for the selected asset, timeframe, and outcome, then returns:

- orderbook bids;
- orderbook asks;
- market slug;
- token id;
- tick size.

When the user clicks a Polymarket orderbook cell:

- clicking ask liquidity creates a BUY order draft;
- clicking bid liquidity creates a SELL order draft;
- in one-click mode, the order is submitted immediately;
- in confirmation mode, the order is staged first and submitted with the Open Order button.

Before an order is sent, the terminal checks:

- valid order size;
- maximum order size;
- maximum spread;
- minimum available liquidity;
- connected wallet;
- Polygon network;
- token id availability;
- trading wallet availability.

The CLOB client is initialized in:

```text
src/app/Components/verifyUser.tsx
```

The current implementation uses Polymarket proxy/deposit-wallet style signing:

```text
SignatureTypeV2.POLY_PROXY
```

The deposit wallet is derived/deployed through the Polymarket relayer before the order is sent.

## API Routes

Key API routes:

```text
src/app/api/db.ts
src/app/api/user/safe/route.ts
src/app/api/profile/portfolio/route.ts
src/app/api/crypto/prices/route.ts
src/app/api/crypto/candles/route.ts
src/app/api/pol/orderbook/route.ts
src/app/api/pol/chart/route.ts
src/app/api/pol/poses/route.ts
src/app/api/polymarket-builder-sign/route.ts
```

### Database

MySQL is used for user records and wallet-related state.

Database connection:

```text
src/app/api/db.ts
```

Environment variables are read through:

```text
src/app/lib/env.ts
```

### Crypto Market Data

Binance/reference crypto prices and candles are served through:

```text
src/app/api/crypto/prices/route.ts
src/app/api/crypto/candles/route.ts
```

### Polymarket Data

Polymarket fast market data is served through:

```text
src/app/api/pol/orderbook/route.ts
src/app/api/pol/chart/route.ts
```

## Environment Variables

The project expects environment variables for:

- MySQL connection;
- JWT/session signing;
- Reown/Privy app configuration;
- Polymarket builder credentials;
- Polygon RPC;
- Polymarket relayer configuration.

Important security note:

Secrets such as builder secret and passphrase must stay server-side. They should not be exposed through `NEXT_PUBLIC_*` variables.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3002
```

If the global npm installation is broken on the machine, the local Next.js binary can be used directly:

```powershell
.\node_modules\.bin\next.cmd dev -p 3002
```

## Current Product Direction

PolyBook is not intended to be a general-purpose Polymarket clone.

The product direction is narrower:

- fast crypto prediction markets only;
- speed-first scalping workflow;
- orderbook-driven trading;
- preconfigured position sizing;
- multiple workspace setups;
- minimal clicks between decision and order submission;
- Binance data as reference context;
- Polymarket CLOB execution as the core trading path.

## Development Notes

Older routes still exist in the repository, including:

```text
src/app/(routes)/home
src/app/(routes)/markets
src/app/(routes)/scalp
src/app/(routes)/test
```

These are not the current product focus. The active direction is centered on:

```text
src/app/(routes)/scalpTerminal
src/app/(routes)/profile
src/app/Components/CustomConnect.tsx
src/app/Components/verifyUser.tsx
src/app/api/pol/*
```

## Near-Term Priorities

- Stabilize live Polymarket order placement.
- Improve error handling for CLOB and relayer failures.
- Preload trading clients where possible to reduce click-to-order latency.
- Add full open orders / active positions tracking.
- Improve real trade history and win-rate calculation.
- Continue refining the orderbook UI for fast scalping.
- Add keyboard-first trading controls.
