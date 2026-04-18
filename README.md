# Tennis Booking Platform — Multi-Tenant

A multi-tenant tennis court booking and class enrollment platform for Hong Kong tennis clubs. Built with Next.js 15, Supabase, and TypeScript.

**Live:** https://tennis-booking-app-steel.vercel.app

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel |
| Maps | Leaflet + OpenStreetMap |
| Geocoding | Nominatim (OpenStreetMap) |
| Icons | lucide-react |
| Styling | Tailwind CSS |

## Architecture

### Multi-Tenant Model

Each **club** is a tenant. Users can belong to multiple clubs with different roles.

```
Platform
├── Club A (slug: demo)
│   ├── Courts (3)
│   ├── Classes (5)
│   ├── Members (owner, admin, coach, member)
│   └── Bookings
├── Club B (slug: sha-tin)
│   ├── Courts (4)
│   └── ...
└── Club C ...
```

### Database Schema

Core tables:
- `clubs` — tenant table (name, slug, address, settings JSON with lat/lng)
- `club_memberships` — user ↔ club relationship (role: owner/admin/coach/member, status: pending/approved)
- `courts` — belongs to a club (name, surface, indoor, hourly_rate)
- `court_slots` — time slots with availability and pricing
- `classes` — group lessons (club_id, coach, schedule, capacity)
- `class_bookings` — enrollment records
- `bookings` — court reservations
- `settings` — per-club key/value config (composite PK: club_id + key)
- `notifications` — in-app notification system

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can read their own memberships
- Club admins/owners can manage their club's data
- `is_club_admin()` — SECURITY DEFINER function to avoid chicken-and-egg RLS issues
- Public read for clubs, courts, classes (active only)

## Routes

### Public Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, featured clubs, map, value props |
| `/clubs` | Browse all clubs with area filter |
| `/clubs/[slug]` | Club homepage — info, courts, classes, join |
| `/courts` | All courts across platform with map + sidebar |
| `/classes` | All classes across platform |
| `/login` | Email/password login |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |

### Authenticated Pages
| Route | Description |
|-------|-------------|
| `/account` | User dashboard — calendar view, memberships, profile |
| `/clubs/[slug]/courts` | Book a court (time grid, slot selection) |
| `/clubs/[slug]/classes/[id]` | Class details + enrollment |
| `/coach` | Coach dashboard (if user has coach role) |

### Club Admin (`/clubs/[slug]/admin/`)
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stats, quick links |
| `/admin/courts` | Court management — slots, pricing, availability |
| `/admin/classes` | Class management — CRUD, participants |
| `/admin/members` | Member management — approve, roles, remove |
| `/admin/analytics` | Booking analytics |
| `/admin/settings` | Booking rules (advance days, cancel hours, max per user) |

### Platform Admin (`/admin/`)
| Route | Description |
|-------|-------------|
| `/admin` | Platform dashboard — manage all clubs |

## Features

### For Players
- Browse clubs, courts, and classes across Hong Kong
- Interactive map with club locations (Leaflet + OpenStreetMap)
- Book courts with visual time-slot grid
- Enroll in classes
- Weekly calendar view of all bookings
- Multi-club membership from single account
- Password reset flow
- Mobile-responsive with bottom navigation

### For Club Admins
- Court management (slots, pricing per hour, availability toggle)
- Class management (create, edit, view participants, attendance)
- Member management (approve applications, assign roles)
- Booking analytics dashboard
- Configurable booking rules per club
- Auto-geocoding: fill address → lat/lng auto-populated via Nominatim

### For Platform Admins
- Create and manage clubs
- View all clubs and their stats

## Map Features

- **Sidebar** (desktop): left panel listing all clubs, click to fly to location
- **Bottom drawer** (mobile): tap "N 個球會" button, drawer slides up with club list
- Single `MapContainer` instance (avoids Leaflet crash from duplicate mounts)
- Markers show court count per club in popup
- `FlyTo` animation on club selection

## UI Design

- Color scheme: cream (#FFF8F0), gold (#C4A265), dark (#1A1A1A)
- Professional — no emojis, lucide-react SVG icons throughout
- Mobile-first with responsive breakpoints
- Bottom tab navigation on mobile (SVG icons)
- Toast notifications for user feedback
- Loading skeletons for async data

## Development

### Prerequisites
- Node.js 22+
- npm

### Setup
```bash
git clone https://github.com/explorit-lokyeung/tennis-booking.git
cd tennis-booking
npm install
```

### Environment
Supabase credentials are in `lib/supabase.ts` (demo project).

### Run
```bash
npm run dev
# Open http://localhost:3000
```

### Build
```bash
npm run build
```

### Deploy
```bash
vercel --prod
```

## Demo Data

9 Hong Kong tennis clubs with real addresses:
- Demo Tennis Club (黃大仙)
- Victoria Park Tennis (銅鑼灣)
- Sha Tin Tennis Centre (沙田)
- Tai Po Tennis Courts (大埔)
- Tuen Mun Tennis Centre (屯門)
- Tsuen Wan Tennis Club (荃灣)
- Kowloon Tong Tennis (九龍塘)
- Sai Kung Tennis Club (西貢)
- Tseung Kwan O Tennis (將軍澳)

Each club has 2-5 courts, classes, and coaches. Cross-club coaches demonstrate multi-tenant membership.

## Project Structure

```
app/
├── page.tsx              # Landing page
├── layout.tsx            # Root layout (Header, MobileNav, Toast)
├── login/                # Auth
├── forgot-password/
├── reset-password/
├── account/              # User dashboard
├── clubs/
│   ├── page.tsx          # Browse clubs
│   └── [slug]/
│       ├── page.tsx      # Club homepage
│       ├── courts/       # Court booking
│       ├── classes/[id]/ # Class enrollment
│       └── admin/        # Club admin panel
│           ├── courts/
│           ├── classes/
│           ├── members/
│           ├── analytics/
│           └── settings/
├── courts/               # Platform courts + map
├── classes/              # Platform classes
├── coach/                # Coach dashboard
└── admin/                # Platform admin
components/
├── Header.tsx            # Top navigation
├── MobileNav.tsx         # Bottom tab bar (mobile)
├── CourtsMap.tsx          # Leaflet map with sidebar/drawer
├── Toast.tsx             # Toast notification system
├── SuccessAnimation.tsx  # Booking success dialog
└── CartProvider.tsx      # (unused, from earlier iteration)
lib/
├── supabase.ts           # Supabase client
├── auth-context.tsx      # Auth provider + useAuth hook
├── club.ts               # useClub, useMembership, hasRole hooks
├── queries.ts            # Data fetching (getClubs, getAllCourts, etc.)
└── types.ts              # TypeScript interfaces
supabase/
├── migrations/           # SQL migrations (001-005)
└── seed/
    └── demo_data.sql     # Demo club/court/class seed data
```

## Known Issues / Notes

- `classes.id` and `courts.id` are TEXT type (not UUID) — seed data uses UUID-format strings
- Service Worker may cache aggressively — hard refresh or unregister SW after deploy
- Supabase DB is IPv6-only — migrations must be run via Supabase SQL Editor
- `useMembership` had a race condition (loading=false before data set) — fixed with settled flag

## License

Private — Explorit Education
