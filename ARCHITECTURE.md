# Architecture Decision Record — FinancePro

## Overview

FinancePro is a multi-user, freemium (FREE / PRO) full-stack Next.js 15 application (App Router, React 19) on PostgreSQL (Supabase). It started as a single-user Google Sheets replacement and now serves the public in Indonesian and English.

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

### 2. Framework: Next.js 15 App Router

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
- **Security model (T-BOT-1):** the bot serves only *private* chats linked to an account via a one-time 6-digit code (Settings → Connect Telegram → `/link CODE`). Every handler loads the user from `chatId` (`lib/telegramLink.ts`); PRO commands are gated by the effective plan; multi-step state lives in the database (10-minute TTL), not in memory. The webhook requires `TELEGRAM_WEBHOOK_SECRET` (fail closed, 401/503).

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

### Current architecture
- Single PostgreSQL database (Supabase session pooler); every table is scoped by `userId`.
- Rate limiting via Upstash Redis (in-memory fallback in dev — not effective on serverless).
- Bot state in the database; no application-level cache.
- Cron jobs (Vercel): plan expiry, recurring transactions, renewal reminders, weekly digest.

### Known limits / upgrades (when needed)
- **Email throughput**: weekly digest ≈ 230 emails per Mon–Wed window; add a queue or a paid Vercel plan beyond that.
- **Caching**: Upstash Redis for dashboard data if load grows.
- **Reports in memory**: some report/analytics code aggregates in application memory (fine for thousands of rows per user).
- **Dependencies**: remaining `npm audit` highs are build-time only (Sentry/rollup, PostCSS inside Next); fix needs Sentry 11 / Next 16.

---

## Multi-user, plans & security (summary)

- **Auth**: JWT in an httpOnly cookie. API routes verify with `jsonwebtoken`; `middleware.ts` (Edge) uses `jose`. The JWT is *not* trusted for access decisions: `getCurrentUser` reloads role/plan from the DB and `lib/plan.ts` computes the **effective plan** (admin → PRO; expired PRO → FREE; trial = PRO whose expiry equals `trialEndsAt`).
- **Gating**: `requirePro` in PRO routes; FREE is clamped server-side (dashboard and exports limited to the current WIB month, 1 account via `lib/planLimits.ts`).
- **Isolation**: every query filters by `userId`; compound uniques are per user. `tests/api/e2e.test.ts` includes cross-user (IDOR) checks.
- **Payments**: manual transfer via WhatsApp; proof uploaded to a private Supabase bucket; admin approve/reject is an atomic conditional update (`lib/payments.ts`).
- **Time**: business dates use WIB (UTC+7) regardless of server timezone (`lib/dateRange.ts`, `lib/recurring.ts`).
- **Hardening**: security headers + CSP in `next.config.js`; Sentry events are scrubbed of PII (`lib/sentryScrub.ts`); cron routes require `CRON_SECRET`.
- **Jobs**: see `vercel.json` and `DEPLOYMENT.md`.

---

## Directory Structure Rationale

```
app/api/          — API routes (one file = one resource)
app/dashboard/    — All authenticated pages (under layout with sidebar)
app/transactions/ — Transactions page (outside dashboard to keep URL clean)
lib/services.ts   — Single business logic file (keep small, split when >1000 lines)
lib/telegramBot.ts, lib/telegramLink.ts — Bot handlers and account linking
lib/export.ts, lib/import*.ts — CSV/Excel/PDF export and import
tests/api/        — Integration tests (run against a live dev server)
lib/utils.ts      — Pure functions only (no side effects, no DB calls)
prisma/           — Schema + migrations + seed
types/            — Shared TypeScript interfaces
```
