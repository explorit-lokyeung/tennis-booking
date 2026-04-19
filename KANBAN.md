# KANBAN — Tennis Booking Platform (Multi-Tenant)

## Completed

### Phase 1: Database Schema
- [x] T01 — Create `clubs` table (name, slug, description, address, settings JSONB)
- [x] T02 — Create `club_memberships` table (user-club, role, status)
- [x] T03 — Add `club_id` FK to courts, classes, bookings, class_bookings, settings, notifications
- [x] T04 — Migrate existing data to default club
- [x] T05 — RLS policies (is_club_admin SECURITY DEFINER, per-table SELECT/INSERT/UPDATE/DELETE)
- [x] T06 — Settings table composite PK (club_id + key)

### Phase 2: Frontend Multi-Tenant
- [x] T07 — Club context provider (useClub, useMembership, hasRole hooks)
- [x] T08 — Club homepage `/clubs/[slug]` with info, courts, classes
- [x] T09 — Club admin layout with role-based access
- [x] T10 — Club admin dashboard (stats, quick links)
- [x] T11 — Club admin court management (slots, pricing, availability)
- [x] T12 — Club admin class management (CRUD, participants, attendance)
- [x] T13 — Club admin member management (approve, roles, remove)
- [x] T14 — Club admin analytics
- [x] T15 — Club admin settings (booking rules per club)
- [x] T16 — Platform landing page (hero, featured clubs, stats)
- [x] T17 — Browse clubs page with area filter
- [x] T18 — Court booking flow scoped to club
- [x] T19 — Class enrollment scoped to club
- [x] T20 — Account page with multi-club memberships
- [x] T21 — Join club flow (apply for membership)
- [x] T22 — Platform admin (create/manage clubs)

### Phase 3: Polish & Features
- [x] T23 — Platform `/courts` with Leaflet map
- [x] T24 — Platform `/classes` page
- [x] T25 — Demo data seed (9 HK clubs)
- [x] T26 — Account calendar view (weekly bookings, club filter)
- [x] T27 — Court grouping by club
- [x] T28 — Auto-geocoding (address to lat/lng)
- [x] T29 — Map sidebar (desktop) + bottom drawer (mobile)
- [x] T30 — Homepage map section
- [x] T31 — Forgot password + reset flow
- [x] T32 — Profile edit
- [x] T33 — Notification bell
- [x] T34 — 404 page
- [x] T35 — Replace emojis with lucide-react SVG icons
- [x] T36 — Mobile-responsive bottom navigation
- [x] T37 — Admin auth race condition fix
- [x] T38 — Consistent Chinese date format

### Phase 4: Production Ready
- [x] T39 — Booking cancellation (soft delete, 2hr deadline, slot release)
- [x] T40 — Class cancellation (24hr notice, soft delete, waitlist-aware)
- [x] T41 — SEO metadata all pages (title template, OG, keywords)
- [x] T42 — Preview-only mode for non-members on court booking
- [x] T43 — Advance open hour setting (LCSD-style morning release)
- [x] T44 — Club logo display on cards and pages
- [x] T45 — Class waitlist (auto-join when full)
- [x] T46 — Booking heatmap analytics (day x hour matrix)
- [x] T47 — Audit log utility (lib/audit.ts)
- [x] T48 — Court photo URL field + admin form + preview
- [x] T49 — Coach weekly schedule grid
- [x] T50 — i18n framework (ZH/EN) + header toggle
- [x] T51 — Service Worker v4 bump
- [x] T52 — Migration 006 (court images, recurring booking fields)

## Backlog (Future)

- [ ] Wire i18n `t()` calls into all page text (framework ready, needs page-by-page adoption)
- [ ] Email notifications (booking confirmation, class reminder) — needs SMTP/Resend
- [ ] Push notifications — needs web push setup
- [ ] Payment integration (Stripe / PayMe)
- [ ] Recurring booking UI (DB fields ready)
- [ ] Court photo file upload (Supabase Storage) — URL field works now
- [ ] Club branding colors (custom theme per club)
- [ ] Multi-language full adoption (all pages use t())
- [ ] PWA offline page
- [ ] API rate limiting
