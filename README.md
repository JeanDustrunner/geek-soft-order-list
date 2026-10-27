# Order List

[![CI](https://github.com/JeanDustrunner/geek-soft-order-list/actions/workflows/ci.yml/badge.svg)](https://github.com/JeanDustrunner/geek-soft-order-list/actions/workflows/ci.yml)

Live demo: https://jeandustrunner.github.io/geek-soft-order-list/

Angular app showing open trading orders grouped by symbol, with profit updating live from a quote
feed. I wrote it as a recruitment task for GeekSoft and later reworked it based on the feedback
from their technical review (details below).

## What it does

- Orders are grouped by symbol. The group row shows the number of orders, total size, average open
  price (weighted by size), total swap and total profit. Clicking it expands the orders.
- Profit is calculated as `(bid - openPrice) * size * contractSize * sideMultiplier` and updates
  whenever a new quote comes in.
- You can close a single order or a whole group, a toast shows which order numbers were closed.
- New orders can be added through a form with validation. They open at the current bid.
- A small badge next to the "Add new order" button shows if the quote connection is up.
- Light/dark theme based on system settings, can be switched manually.
- The table is hand-made, no table or component libraries.

## Running locally

You need Node 24.15+ (22.22.3+ works too).

```bash
npm install
npm start            # http://localhost:4200, bundled data and simulated quotes
npm run start:live   # same, but uses GeekSoft's original endpoints and WebSocket
npm test
npm run lint
npm run build
```

There's a pre-commit hook (husky + lint-staged) running Prettier and ESLint on staged files. CI runs
the format check, lint, tests and build on every push and deploys master to GitHub Pages.

## Project structure

The whole thing is one feature in `src/app/features/orders/`:

```
domain/       plain TS, no Angular: models, profit, grouping, precision, parsers
data-access/  HTTP resources, quote sources (WebSocket or simulated), signal store
ui/           presentational components and pipes, inputs/outputs only
feature/      container component that connects the store with the UI, feature providers
testing/      test builders and a fake WebSocket
```

`domain/` doesn't import anything from Angular, so profit calculation, grouping and parsing are
tested as plain functions. `ui/` and `data-access/` both depend on `domain/`, never the other way
round.

## Some decisions worth explaining

### Quotes don't re-render the whole table

Grouping only depends on the list of orders. Every symbol has its own bid signal and each row
calculates its own profit from its `order` and `bid` inputs. So a quote for BTCUSD only touches the
BTCUSD rows, and if the bid didn't actually change, nothing happens at all. There are tests for this
in `orders.store.integration.spec.ts` ("update granularity").

### WebSocket subscriptions

The list of symbols to subscribe is computed from the open orders, plus whatever symbol is picked in
the add-order form (so the form can show the current price). The service sends `addlist` and
`removelist` only for the difference. When the connection drops, it reconnects with exponential
backoff and subscribes the full list again.

### Demo mode

The store doesn't talk to the WebSocket service directly, it uses a `QuotesSource` abstract class as
the DI token. There are two implementations: the real `WebSocketService` and
`SimulatedQuotesService`, which moves prices randomly. The default build uses the simulated one and
the JSON files bundled in `public/mock/`, so the demo keeps working even if the original servers go
away. `npm run start:live` switches to the real ones (Angular environment file replacement).

### Validating what comes from outside

Both HTTP responses and WebSocket messages go through type guards in `domain/`. If a response has
the wrong shape, the app shows an error instead of an empty table. A single broken record is just
skipped (with a `console.warn`), so one bad order doesn't take down the rest.

### Number formatting

Calculations use full precision, rounding only happens for display. Amounts of 1 or more get two
decimals, smaller ones get two significant digits (max 8 decimals), otherwise a swap like -0.0075
would show up as -0.01. The profit color is based on the rounded value, so you never get a red or
green "0.00". If there's no price yet, profit shows a dash.

### Add-order form

It uses Signal Forms. The open price is a `linkedSignal` of the current bid (the earlier version
copied it into the model with an `effect`). Values the user already typed stay when the price
changes.

### Data is loaded once

Orders are fetched once on startup. Refreshing them while the app runs would need some merging logic
for orders added locally, which I left out on purpose.

## Stack

Angular 22 (standalone components, zoneless, signals, `httpResource`, Signal Forms), TypeScript,
RxJS for the WebSocket stream, ngx-sonner for toasts, Vitest, ESLint, Prettier, GitHub Actions.

## AI usage

I came up with the architecture and the main decisions myself (no component library, a signal store
without extra libraries, a domain layer independent of Angular). I used Claude for code review
during the whole project, to get a starting point for the WebSocket service (I hadn't written one
from scratch before) and for most of the styling and tests, which I planned and reviewed.

## Data

Order, instrument and contract type data come from the GeekSoft recruitment task (originally served
from geeksoft.pl). The copies in `public/mock/` are only there so the demo works. Quotes in the demo
are simulated.
