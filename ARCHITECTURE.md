# Architecture Decision Record — FinancePro

## Overview

FinancePro is a full-stack Next.js 14 application using the App Router. It replaces Google Sheets as the data backend with a proper relational database, while retaining all original features.

---

## Key Architectural Decisions

### 1. Database: PostgreSQL + Prisma ORM

**Chosen over**: Google Sheets, SQLite, MongoDB

**Reasoning**:
- Google Sheets works well as a UI for manual entry, but it's slow (API rate limits: 60 req/min), has no transactions support, and is hard to query relationally (e.g. "sum expenses by category for this month WHERE account is 'BCA'").
- PostgreSQL is battle-tested for financial data, supports ACID transactions, and has excellent Prisma support.
- SQLite was considered for simplicity, but Vercel's serverless functions are stateless — SQLite requires a persistent filesystem. Turso (SQLite-as-a-service) is an option but adds complexity.
- MongoDB was rejected because financial data is inherently relational (Transaction → Category → Budget).

**Free options**: Supabase, Neon, Railway, Vercel Postgres (all have generous free tiers).

### 2. Framework: Next.js 14 App Router

**Chosen over**: Express.js + React SPA, FastAPI + React

**Reasoning**:
- API Routes + React components in one project = zero separate deployment.
- Vercel deploys Next.js natively with zero config.
- Server Components reduce client bundle size for data-heavy pages.
- App Router's `route.ts` files make REST endpoints clean and colocated.

### 3. Telegram Bot: grammY

**Chosen over**: Telegraf, python-telegram-bot, node-telegram-bot-api

**Reasoning**:
- grammY is TypeScript-native with excellent type safety.
- Webhooks fit perfectly in Next.js API routes (no separate bot process).
- Telegraf is older and has worse TypeScript support.
- The webhook model means the bot runs serverlessly — no always-on server needed.

### 4. Charts: Recharts

**Chosen over**: Chart.js, ApexCharts, Victory, D3

**Reasoning**:
- Recharts is React-native (no DOM manipulation needed).
- Fully composable (each chart element is a component).
- Good TypeScript support.
- Lightweight enough for Vercel free tier.

### 5. Styling: Tailwind CSS

**Chosen over**: CSS Modules, Styled Components, Material UI, Chakra UI

**Reasoning**:
- Zero runtime overhead (no CSS-in-JS).
- Utility classes = no naming conflicts in a growing codebase.
- Dark mode is trivial (just use `slate-800`, `slate-900` etc).
- shadcn/ui components can be added later without refactoring.

---

## Data Flow

```
User (Web/Telegram)
        │
        ▼
Next.js API Routes (/app/api/*)
        │
        ▼
Service Layer (lib/services.ts)
  - Business logic
  - Computed fields (debt totals, asset P&L, budget status)
  - No raw SQL — all through Prisma
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL Database
```

### Why a Service Layer?

Both the API routes AND the Telegram bot need the same business logic. Without a service layer, you'd duplicate the "compute debt totals" logic in both `app/api/debts/route.ts` AND `lib/telegramBot.ts`. The service layer is the single source of truth.

---

## Financial Logic Notes

### Revolving Debt (Credit Card / Paylater)

```
Total Spent = SUM(expenses WHERE account.name = debt.name)
Total Paid  = SUM(expenses WHERE category IN ['Cicilan','Pembayaran Utang']
                             AND description CONTAINS debt.name)
Remaining   = Total Spent - Total Paid
Sisa Limit  = Limit - Remaining
Status      = Over Limit if Total Spent > Limit
```

This mirrors how a credit card works: every swipe increases utilization, every payment reduces it.

### Fixed Debt (KPR, KKB, KUR)

```
Total Paid  = SUM(payments referencing this debt)
Remaining   = Principal - Total Paid
```

Principal never increases (fixed installment loan).

### Asset Total Capital

```
Total Capital = Initial Capital + SUM(Buy transactions) - SUM(Sell transactions)
P&L           = Current Value (manual) - Total Capital
Return %      = P&L / Total Capital × 100
```

This is the standard cost-basis method for unrealized gain/loss tracking.

### Budget Status Thresholds

```
< 80%  → Aman
80-99% → Hampir Over
≥ 100% → Over Budget
```

Configurable via `lib/utils.ts:getBudgetStatus()`.

### Goal Status

```
progress >= 100%         → Tercapai
targetDate in the past
AND progress < 100%      → Gagal
otherwise                → On Track
```

---

## Scalability Considerations

### Current Architecture (MVP)
- Single PostgreSQL database
- In-memory bot session state (lost on restart)
- No caching

### Easy Upgrades (when needed)
- **Caching**: Add Upstash Redis for dashboard data (cache for 5 min)
- **Bot Sessions**: Replace in-memory Map with Redis or DB-backed sessions
- **Multi-user**: Add NextAuth.js + userId foreign keys to all tables
- **Background Jobs**: Vercel Cron for monthly report generation
- **Search**: PostgreSQL full-text search on transaction descriptions

---

## Directory Structure Rationale

```
app/api/          — API routes (one file = one resource)
app/dashboard/    — All authenticated pages (under layout with sidebar)
app/transactions/ — Transactions page (outside dashboard to keep URL clean)
lib/services.ts   — Single business logic file (keep small, split when >1000 lines)
lib/telegramBot.ts — Bot handlers (colocated with other lib code)
lib/utils.ts      — Pure functions only (no side effects, no DB calls)
prisma/           — Schema + migrations + seed
types/            — Shared TypeScript interfaces
```
