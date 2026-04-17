# 🎾 Tennis Class Booking & Court Reservation

A modern web app for booking tennis courts and enrolling in tennis classes, built with Next.js 15 and Supabase.

**Live Site:** https://explorit-lokyeung.github.io/tennis-booking/  
**Admin Dashboard:** https://explorit-lokyeung.github.io/tennis-booking/admin/

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4 (Nike-inspired cream/black/gold) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | GitHub Pages (static export) |
| Auth | Supabase Auth (email/password) |

## Architecture

```
Static HTML (GitHub Pages)
     ↓ client-side JS
Supabase (PostgreSQL + Auth)
     ↓ RLS policies
Data (courts, slots, classes, bookings)
```

- **No server required** — all Supabase calls are client-side (`'use client'`)
- **Static export** (`output: 'export'`) compatible with GitHub Pages
- **Row Level Security (RLS)** enforces all permissions at the database level

---

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, stats, featured classes |
| `/classes/` | Browse all visible tennis classes |
| `/classes/[id]/` | Class detail — info, enroll, cancel enrollment |
| `/courts/` | 7-day court grid — view availability, book 1-2 consecutive slots |
| `/login/` | Login / Register (Supabase Auth) |
| `/account/` | User dashboard — view & cancel bookings |

### Admin (`/admin/`)

| Route | Description |
|-------|-------------|
| `/admin/` | Admin login (Supabase Auth + `is_admin` check) |
| `/admin/classes/` | CRUD classes, toggle visibility, manage participants (name/email/phone), autocomplete user search |
| `/admin/courts/` | 7-day slot grid, open/close slots, bulk operations, custom per-slot pricing, edit court name & hourly rate |
| `/admin/bookings/` | View all bookings, cancel bookings |

---

## Database Schema

### Tables

```
courts
├── id (text, PK)          — e.g. "court-a"
├── name (text)             — e.g. "Court A"
├── hourly_rate (integer)   — default price per hour
└── surface_type (text)     — e.g. "Hard Court"

slots (on-demand — no row = available)
├── id (uuid, PK)
├── court_id (text, FK → courts)
├── date (date)
├── hour (integer)          — 0-23
├── status (text)           — 'booked' | 'closed'
├── booked_by (uuid, FK → auth.users)
├── price (integer)         — custom price override (nullable)
└── CHECK (status IN ('available', 'booked', 'closed'))

bookings
├── id (uuid, PK)
├── user_id (uuid, FK → auth.users)
├── slot_id (uuid, FK → slots)
├── court_id (text)
├── date (date)
├── hour (integer)
├── total_price (integer)
└── created_at (timestamptz)

classes
├── id (text, PK)
├── name (text)
├── coach (text)
├── level (text)            — 'Beginner' | 'Intermediate' | 'Advanced'
├── day (text)
├── time (text)
├── location (text)
├── spots_available (integer)
├── spots_total (integer)
├── price (integer)
├── description (text)
└── visible (boolean)       — false = hidden from public

class_bookings
├── id (uuid, PK)
├── class_id (text, FK → classes)
├── user_id (uuid, FK → auth.users)
├── status (text)           — 'confirmed'
└── created_at (timestamptz)

profiles
├── id (uuid, PK, FK → auth.users)
├── is_admin (boolean)
└── created_at (timestamptz)
```

### On-Demand Slot Architecture

- **No row = available** (default state)
- Only `booked` and `closed` rows are stored
- Keeps the database clean — no pre-generation of thousands of empty slots
- Availability is inferred client-side by checking what's NOT in the DB

### Key Constraints

```sql
-- Prevent same user booking multiple courts at the same time
CREATE UNIQUE INDEX idx_slots_user_date_hour
  ON slots (booked_by, date, hour)
  WHERE status = 'booked' AND booked_by IS NOT NULL;
```

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| courts | Everyone | Admin | Admin | Admin |
| slots | Everyone | Auth users (book) + Admin (close) | Admin | Admin |
| bookings | Own bookings only | Auth users | — | Admin |
| classes | Visible classes | Admin | Admin | Admin |
| class_bookings | Own enrollments | Auth users | — | Admin + Own |
| profiles | Own profile | Auto (trigger) | Own profile | — |

### Admin Access

- Admin determined by `profiles.is_admin = true`
- No `service_role` key on client — all admin operations use RLS
- Admin logs in via Supabase Auth (same flow as regular users)

### Database Functions (SECURITY DEFINER)

```sql
-- Search users by email (admin only)
find_user_by_email(search_email TEXT)
→ Returns: id, email, raw_user_meta_data

-- Get class participants with user info (admin only)
get_class_participants(p_class_id TEXT)
→ Returns: booking_id, user_id, status, created_at, email, name, phone
```

### What's Safe to Expose

- ✅ Supabase URL — public by design
- ✅ Anon/publishable key — public by design (RLS controls access)
- ❌ Service role key — **never on client** (deleted `lib/supabase-admin.ts`)

---

## Supabase Configuration

| Setting | Value |
|---------|-------|
| Project URL | `https://xtinvnccabizaweqyszz.supabase.co` |
| Auth: Email confirmation | Disabled (for dev) |
| Auth: Site URL | `https://explorit-lokyeung.github.io/tennis-booking/` |
| Realtime | ⚠️ Not working with new key format; using 2s polling |

---

## Deployment

### Build & Deploy

```bash
cd tennis-booking-app
npm run build                    # Static export to ./out/
cd out
cp index.html 404.html           # SPA fallback for GitHub Pages
git init -b gh-pages
touch .nojekyll
git add -A && git commit -m "deploy"
git remote add origin https://github.com/explorit-lokyeung/tennis-booking.git
git push origin gh-pages --force
```

### Key Config (`next.config.ts`)

```ts
{
  output: 'export',              // Static HTML export
  basePath: '/tennis-booking',   // GitHub Pages subdirectory
  trailingSlash: true,           // Required for GitHub Pages routing
  images: { unoptimized: true }  // No image optimization for static
}
```

### Important Notes

- `Link href` should NOT include basePath (Next.js adds it automatically)
- `fetch()` URLs DO need basePath prefix
- `404.html` = copy of `index.html` for SPA client-side routing

---

## UI Design

- **Theme:** Nike-inspired — cream `#FFF8F0` background, black `#1A1A1A` text, gold `#C4A265` accents
- **Language:** Traditional Chinese (繁體中文)
- **Dark mode:** Disabled — forced light cream theme regardless of OS setting
- **Responsive:** Mobile-first, works on all screen sizes

---

## Features Summary

### User Features
- 🔐 Register & login (email/password)
- 🎾 Browse & book courts (7-day view, real-time availability via 2s polling)
- 📚 Browse & enroll in classes (with cancel)
- 🕐 Multi-session booking (1-2 consecutive hours)
- 👤 Account page — view all bookings & enrollments
- ⛔ Cannot double-book same time slot (DB constraint)

### Admin Features
- 📋 Class CRUD — create, edit, delete, show/hide
- 👥 Participant management — autocomplete user search, add/remove, view name/email/phone
- 🏟️ Court management — open/close slots, bulk operations, custom pricing
- 📊 Booking management — view all, cancel any
- 🔒 Secured by RLS + `profiles.is_admin`

---

## File Structure

```
tennis-booking-app/
├── app/
│   ├── layout.tsx              # Root layout + Navbar + AuthProvider
│   ├── globals.css             # Tailwind + forced light theme
│   ├── page.tsx                # Landing page
│   ├── login/page.tsx          # Auth (login/register)
│   ├── account/page.tsx        # User dashboard
│   ├── classes/
│   │   ├── page.tsx            # Class listing
│   │   └── [id]/
│   │       ├── page.tsx        # Static params wrapper
│   │       └── ClassDetailClient.tsx  # Class detail + enroll
│   ├── courts/page.tsx         # Court booking grid
│   └── admin/
│       ├── page.tsx            # Admin login
│       ├── classes/page.tsx    # Class management
│       ├── courts/page.tsx     # Slot management
│       └── bookings/page.tsx   # Booking management
├── lib/
│   ├── supabase.ts             # Supabase client (anon key only)
│   └── auth-context.tsx        # React auth context provider
├── next.config.ts
├── package.json
└── README.md
```

---

## Known Limitations

1. **Supabase Realtime not working** — new `sb_publishable_` key format subscribes OK but never fires `postgres_changes` events. Workaround: 2-second polling.
2. **Class IDs are pre-generated** (1-20) via `generateStaticParams` — adding class #21+ requires rebuild.
3. **No payment integration** — booking is free, no Stripe/PayPal.
4. **No email notifications** — no booking confirmation emails yet.

## Future Enhancements

- 📧 Email notifications (booking confirmation, reminders)
- 💳 Payment integration (Stripe)
- 📱 PWA support (offline, push notifications)
- 📊 Admin analytics dashboard
- 🔄 Fix Supabase Realtime or implement WebSocket fallback
- 🌐 Multi-language support
