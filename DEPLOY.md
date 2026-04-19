# Production Deployment Guide

## Prerequisites
- Supabase account (free tier works)
- Vercel account
- Node.js 22+

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick a name (e.g., `tennis-booking-prod`)
3. Set a strong database password
4. Choose region: **Southeast Asia (Singapore)** for HK users
5. Wait for project to be ready

## Step 2: Run Database Setup

1. Go to Supabase Dashboard → **SQL Editor**
2. Open `supabase/production_setup.sql` from this repo
3. Copy the entire contents and paste into the SQL editor
4. Click **Run** — all tables, RLS policies, and functions will be created
5. Verify: go to **Table Editor** — you should see: clubs, club_memberships, courts, court_slots, classes, bookings, class_bookings, settings, notifications

## Step 3: Configure Supabase Auth

1. Dashboard → **Authentication** → **Providers**
   - Email: enabled (default)
   - Google OAuth (optional): add your Google Client ID/Secret
2. Dashboard → **Authentication** → **URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: add `https://your-domain.com/**`
3. Dashboard → **Authentication** → **Email Templates** (optional)
   - Customize confirmation and reset emails

## Step 4: Get Supabase Credentials

1. Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Deploy to Vercel

### Option A: CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```
When prompted, set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` = your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key

### Option B: Vercel Dashboard
1. Import Git repo at [vercel.com/new](https://vercel.com/new)
2. Set environment variables in project settings
3. Deploy

## Step 6: Create First Club

1. Go to your deployed site → `/admin`
2. Note: you need to be a platform admin. For the first user:
   - Register an account on the site
   - In Supabase SQL Editor, run:
     ```sql
     -- Replace with your actual user ID from auth.users
     UPDATE auth.users SET raw_user_meta_data = 
       jsonb_set(COALESCE(raw_user_meta_data, '{}'), '{role}', '"platform_admin"')
     WHERE email = 'your-email@example.com';
     ```
3. Go to `/admin` → Create your first club
4. The creating user automatically becomes the club owner

## Step 7: Custom Domain (Optional)

1. Vercel Dashboard → Project → **Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed
4. Update Supabase Auth redirect URLs to include your new domain

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Production | Live site, clean data | Your custom domain |
| Staging | Demo data, testing | tennis-booking-app-steel.vercel.app |

## Troubleshooting

**"Missing env vars" error on build**
→ Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.

**Can't access /admin**
→ User needs `platform_admin` role in `raw_user_meta_data`. See Step 6.

**RLS errors (empty data)**
→ Make sure you ran the full `production_setup.sql`. Check Supabase → Authentication → Users to verify users exist.

**Service Worker serving old content**
→ Hard refresh (Ctrl+Shift+R) or clear site data in DevTools → Application → Clear Storage.
