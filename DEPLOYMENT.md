# Deployment Guide — FinancePro

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase recommended — free, fast setup)
- A Telegram bot token from @BotFather
- A Vercel account (free)

---

## Step 1: Setup Database (Supabase)

1. Go to https://supabase.com → Sign up → New Project
2. Choose a region closest to your users
3. Wait for the project to provision (~1 minute)
4. Go to **Settings** → **Database** → **Connection string** → **URI**
5. Copy the connection string (it looks like `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`)
6. Replace `[password]` with your actual database password
7. Save this as your `DATABASE_URL`

---

## Step 2: Create Telegram Bot

1. Open Telegram → Search for `@BotFather`
2. Send `/newbot`
3. Enter a name: e.g. `FinancePro Bot`
4. Enter a username: e.g. `financepro_myname_bot` (must end in `bot`)
5. BotFather will send you a token like: `1234567890:ABCdef...`
6. Save this as your `TELEGRAM_BOT_TOKEN`

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# In the project directory
vercel

# Follow the prompts:
# - Link to existing project? No → create new
# - Project name: financepro
# - Root directory: ./
# - Build command: prisma generate && next build
# - Output directory: (leave blank)
```

### Option B: Deploy via GitHub

1. Push code to GitHub
2. Go to https://vercel.com → New Project
3. Import your GitHub repo
4. Vercel will auto-detect Next.js settings

---

## Step 4: Set Environment Variables on Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Your Supabase connection string | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | Your bot token | Production, Preview, Development |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` | Production |

---

## Step 5: Run Database Migration

After deployment, run the migration. You can do this locally with the production DATABASE_URL:

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgresql://..."

# Push schema to production database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed
```

Or use Vercel CLI to run it in the cloud:

```bash
vercel env pull .env.production.local
npx prisma db push --schema ./prisma/schema.prisma
```

---

## Step 6: Set Telegram Webhook

After deployment, set the webhook so Telegram sends updates to your app:

```bash
# Replace YOUR_BOT_TOKEN and YOUR_VERCEL_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_VERCEL_URL/api/webhook"}'
```

Expected response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

Verify webhook is set:
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

---

## Step 7: Verify Everything Works

1. Open `https://your-app.vercel.app` → you should see the landing page
2. Open `https://your-app.vercel.app/dashboard` → dashboard should load
3. Open Telegram → find your bot → send `/start`
4. Bot should reply with the welcome message

---

## Local Development

```bash
# 1. Copy env example
cp .env.local.example .env.local

# 2. Edit .env.local with your values
# DATABASE_URL can be a local Postgres or Supabase URL

# 3. Push schema
npm run db:push

# 4. Seed data
npm run db:seed

# 5. Start dev server
npm run dev
```

### Testing Telegram Bot Locally

Use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com
ngrok http 3000

# Set webhook to ngrok URL
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -d '{"url": "https://XXXX.ngrok.io/api/webhook"}'
```

---

## Troubleshooting

### "PrismaClientInitializationError"
→ Check `DATABASE_URL` is correct and the database is accessible from Vercel's IP range (Supabase allows all IPs by default).

### Bot doesn't respond
→ Check webhook is set: `curl https://api.telegram.org/botTOKEN/getWebhookInfo`
→ Check Vercel function logs: Vercel Dashboard → Logs

### "Module not found: @prisma/client"
→ Make sure `postinstall` script runs: `"postinstall": "prisma generate"` in package.json (already set).

### Dashboard shows no data
→ Run the seed script: `npm run db:seed`
→ Or add data via the web UI or bot commands.

---

## Updating the App

```bash
# Make changes, then:
vercel --prod
# Vercel auto-deploys from GitHub if connected
```

If you changed the Prisma schema:
```bash
npm run db:migrate  # development
# For production: npm run db:push (simpler, no migration files)
```

---

## Custom Domain (Optional)

In Vercel Dashboard → Your Project → Settings → Domains → Add Domain.
Update `NEXT_PUBLIC_BASE_URL` to your custom domain.
Update the Telegram webhook URL accordingly.
