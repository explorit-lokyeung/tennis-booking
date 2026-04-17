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
| PWA | Service Worker + manifest.json |

## Architecture

```
Static HTML (GitHub Pages)
     ↓ client-side JS
Supabase (PostgreSQL + Auth)
     ↓ RLS policies
Data (courts, slots, classes, bookings, settings)
```

- **No server required** — all Supabase calls are client-side (`'use client'`)
- **Static export** (`output: 'export'`) compatible with GitHub Pages
- **Row Level Security (RLS)** enforces all permissions at the database level
- **HKT timezone** — all dates and time logic use `Asia/Hong_Kong`

---

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, stats, featured classes |
| `/classes/` | Browse all visible tennis classes |
| `/classes/[id]/` | Class detail — info, enroll, cancel enrollment |
| `/courts/` | 8-day court grid — view availability, book 1-2 consecutive slots |
| `/login/` | Login / Register (Supabase Auth) |
| `/account/` | User dashboard — view & cancel court bookings and class enrollments |

### Admin (`/admin/`)

| Route | Description |
|-------|-------------|
| `/admin/` | Admin login (Supabase Auth + `is_admin` check) |
| `/admin/classes/` | CRUD classes, toggle visibility, manage participants, autocomplete user search, start/end dates |
| `/admin/courts/` | 14-day slot grid (7 per page), open/close slots, bulk operations, custom pricing, edit court details (name/rate/location/address/description/facilities/indoor), configurable operating hours |
| `/admin/bookings/` | View all bookings, cancel bookings |

---

## Database Schema

### Tables

```
courts
├── id (text, PK)              — e.g. "court-a"
├── name (text)                 — e.g. "Court A"
├── hourly_rate (integer)       — default price per hour
├── surface_type (text)         — e.g. "Hard Court"
├── location (text)             — e.g. "沙田"
├── address (text)              — full address
├── description (text)          — venue description
├── facilities (text)           — e.g. "燈光, 更衣室, 停車場"
└── indoor (boolean)            — true = indoor court

slots (on-demand — no row = available)
├── id (uuid, PK)
├── court_id (text, FK → courts)
├── date (date)
├── hour (integer)              — 0-23
├── status (text)               — 'booked' | 'closed'
├── booked_by (uuid, FK → auth.users)
├── price (integer)             — custom price override (nullable)
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
├── coach_bio (text)
├── level (text)                — 'Beginner' | 'Intermediate' | 'Advanced'
├── day (text)
├── time (text)
├── duration (text)
├── location (text)
├── spots_available (integer)
├── spots_total (integer)
├── price (integer)
├── description (text)
├── visible (boolean)           — false = hidden from public
├── start_date (date)           — class start date
└── end_date (date)             — class end date

class_bookings
├── id (uuid, PK)
├── class_id (text, FK → classes)
├── user_id (uuid, FK → auth.users)
├── status (text)               — 'confirmed'
└── created_at (timestamptz)

profiles
├── id (uuid, PK, FK → auth.users)
├── is_admin (boolean)
└── created_at (timestamptz)

settings
├── key (text, PK)              — e.g. 'open_hour', 'close_hour'
└── value (text)                — e.g. '7', '23'
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

## Booking Rules

### Time & Date Logic (HKT)

- All dates generated using `Asia/Hong_Kong` timezone
- **Day 1 (today):** Past hours are disabled (greyed out, not clickable)
- **Days 2-6:** Fully bookable
- **Day 7 (6 days ahead):** View-only ("預覽") until **9:00 AM HKT**, then bookable — this is the "6-day advance booking" window
- **Day 8 (7 days ahead):** Always view-only ("預覽"), never bookable

### Operating Hours

- Default: **7:00 AM – 11:00 PM** (configurable via `settings` table)
- Admin can adjust open/close hours from the courts management page
- Changes take effect immediately on both admin and public pages

### Anti-Double-Booking

- Database unique partial index prevents same user from booking 2 courts at the same time slot
- Race condition protection: booking uses INSERT for new slot; duplicate fails at DB level

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| courts | Everyone | Admin | Admin | Admin |
| slots | Everyone | Auth users (book) + Admin (close) | Admin | Admin + Own booked |
| bookings | Own bookings only | Auth users | — | Admin |
| classes | Visible classes | Admin | Admin | Admin |
| class_bookings | Own enrollments | Auth users | — | Admin + Own |
| profiles | Own profile | Auto (trigger) | Own profile | — |
| settings | Everyone | Admin | Admin | — |

### Admin Access

- Admin determined by `profiles.is_admin = true`
- No `service_role` key on client — all admin operations use RLS
- Admin logs in via Supabase Auth (same flow as regular users)
- Admin layout provides auth guard + navigation (separate from public nav)

### Database Functions (SECURITY DEFINER)

```sql
-- Search users by email (admin only, supports ILIKE wildcard)
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
- Service Worker cache version must be bumped (`tennis-v2` → `tennis-v3`) when deploying breaking changes

---

## UI Design

- **Theme:** Nike-inspired — cream `#FFF8F0` background, black `#1A1A1A` text, gold `#C4A265` accents
- **Language:** Traditional Chinese (繁體中文)
- **Dark mode:** Disabled — forced light cream theme (removed `prefers-color-scheme: dark` from globals.css)
- **Responsive:** Mobile-first with dedicated mobile layouts
  - Public: bottom navigation bar (4 tabs: 首頁/課堂/球場/我的)
  - Admin courts: single-court view with court tab selector on mobile; full 6-court table on desktop
  - Admin nav hidden on public pages; public nav hidden on admin pages

### Animations

- `fadeIn`, `slideUp`, `bounceIn` — page entry animations
- `shimmer` — skeleton loading placeholders
- `slide-in` / `slideDown` — toast notification enter/exit
- Card hover (shadow + translate), button press (active:scale), slot hover (scale-105)
- Smooth scroll, scroll-to-top button

### Components

| Component | Description |
|-----------|-------------|
| `Toast.tsx` | Toast notification system (ToastProvider + useToast hook) |
| `ScrollToTop.tsx` | Floating scroll-to-top button |
| `MobileNav.tsx` | Bottom navigation bar (hidden on admin pages) |
| `SuccessAnimation.tsx` | Full-screen success overlay with checkmark |
| `Skeleton.tsx` | Loading skeletons (CardSkeleton, TableSkeleton, CourtGridSkeleton) |
| `Header.tsx` | Top navigation bar (hidden on admin pages) |

---

## PWA Support

- `manifest.json` with app name, icons (192px + 512px), theme color
- Service Worker (`sw.js`) with network-first caching strategy
- `apple-mobile-web-app-capable` meta tags for iOS
- Offline caching: Account page caches bookings/class_bookings to localStorage
- Cache version: `tennis-v2` — bump when deploying breaking changes

---

## Features Summary

### User Features
- 🔐 Register & login (email/password)
- 🎾 Browse & book courts (8-day view, real-time availability via 2s polling)
- 📚 Browse & enroll in classes (with cancel)
- 🕐 Multi-session booking (1-2 consecutive hours on same court)
- 👤 Account page — view & cancel court bookings and class enrollments
- ⛔ Cannot double-book same time slot (DB constraint)
- ⏰ Past time slots auto-disabled (HKT)
- 📅 Day 7 opens at 9AM HKT (6-day advance booking)
- 📱 Responsive mobile-first design with bottom nav
- 🔔 Toast notifications for all actions

### Admin Features
- 📋 Class CRUD — create, edit, delete, show/hide, start/end dates
- 👥 Participant management — autocomplete user search, add/remove, view name/email/phone
- 🏟️ Court management — edit all court details (name, rate, location, address, description, facilities, indoor/outdoor)
- 📅 14-day slot management (7 per page with arrow navigation)
- ⚡ Bulk operations — open/close all slots per court (buttons in table header, aligned with columns)
- 💰 Custom per-slot pricing
- ⏰ Configurable operating hours (dropdown in admin, saved to DB)
- 📊 Booking management — view all, cancel any
- 🔒 Secured by RLS + `profiles.is_admin`
- 📱 Mobile-friendly — single-court view with court tabs on mobile

---

## File Structure

```
tennis-booking-app/
├── app/
│   ├── layout.tsx              # Root layout + AuthProvider + public nav
│   ├── globals.css             # Tailwind + animations + forced light theme
│   ├── page.tsx                # Landing page
│   ├── login/page.tsx          # Auth (login/register)
│   ├── account/page.tsx        # User dashboard (bookings + enrollments)
│   ├── classes/
│   │   ├── page.tsx            # Class listing
│   │   └── [id]/
│   │       ├── page.tsx        # Static params wrapper
│   │       └── ClassDetailClient.tsx  # Class detail + enroll/cancel
│   ├── courts/page.tsx         # Court booking grid (8-day, HKT)
│   └── admin/
│       ├── layout.tsx          # Admin layout (auth guard + admin nav)
│       ├── page.tsx            # Admin login
│       ├── classes/page.tsx    # Class management + participants
│       ├── courts/page.tsx     # Slot management + court details + operating hours
│       └── bookings/page.tsx   # Booking management
├── components/
│   ├── Header.tsx              # Public top nav (hidden on admin)
│   ├── MobileNav.tsx           # Public bottom nav (hidden on admin)
│   ├── Toast.tsx               # Toast notification system
│   ├── ScrollToTop.tsx         # Scroll-to-top floating button
│   ├── SuccessAnimation.tsx    # Success overlay
│   └── Skeleton.tsx            # Loading skeleton components
├── lib/
│   ├── supabase.ts             # Supabase client (anon key only)
│   └── auth-context.tsx        # React auth context provider
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker (cache v2)
│   └── icons/                  # PWA icons (192px, 512px)
├── next.config.ts
├── package.json
└── README.md
```

---

## Known Limitations

1. **Supabase Realtime not working** — new `sb_publishable_` key format subscribes OK but never fires `postgres_changes` events. Workaround: 2-second polling.
2. **Class IDs pre-generated** (1-100) via `generateStaticParams` — IDs beyond 100 still work via 404.html SPA fallback.
3. **No payment integration** — booking is free, no Stripe/PayPal.
4. **No email notifications** — no booking confirmation emails yet.
5. **Service Worker cache** — users with old SW may see stale content; must unregister via DevTools > Application > Service Workers if issues persist.
6. **Admin auth delay** — on GitHub Pages full-page navigation, Supabase needs ~100ms to restore session from localStorage; immediate `getSession()` returns null.

## Future Enhancements

- 📧 Email notifications (booking confirmation, reminders)
- 💳 Payment integration (Stripe)
- 📊 Admin analytics dashboard (revenue, utilization, popular courts/times)
- 🔄 Fix Supabase Realtime or implement WebSocket fallback
- 🌐 Multi-language support
- 🎨 Coach profile pages with photos
- 📅 Recurring booking support
- 🏷️ Membership tiers & pricing
