# KANBAN — Tennis Booking Platform (Multi-Tenant)

## Completed

### Phase 1: Database Schema
- [x] T01 — Create `clubs` table (name, slug, description, address, settings JSONB)
- [x] T02 — Create `club_memberships` table (user↔club, role, status)
- [x] T03 — Add `club_id` FK to courts, classes, bookings, class_bookings, settings, notifications
- [x] T04 — Migrate existing data to default club
- [x] T05 — RLS policies (is_club_admin SECURITY DEFINER, per-table SELECT/INSERT/UPDATE/DELETE)
- [x] T06 — Settings table composite PK (club_id + key)

### Phase 2: Frontend Multi-Tenant
- [x] T07 — Club context provider (useClub, useMembership, hasRole hooks)
- [x] T08 — Club homepage `/clubs/[slug]` with info, courts, classes
- [x] T09 — Club admin layout `/clubs/[slug]/admin/` with role-based access
- [x] T10 — Club admin dashboard (stats, quick links)
- [x] T11 — Club admin court management (slots, pricing, availability)
- [x] T12 — Club admin class management (CRUD, participants, attendance)
- [x] T13 — Club admin member management (approve, roles, remove)
- [x] T14 — Club admin analytics
- [x] T15 — Club admin settings (booking rules per club)
- [x] T16 — Platform landing page (hero, featured clubs, stats)
- [x] T17 — Browse clubs page `/clubs` with area filter
- [x] T18 — Court booking flow scoped to club
- [x] T19 — Class enrollment scoped to club
- [x] T20 — Account page with multi-club memberships
- [x] T21 — Join club flow (apply for membership)
- [x] T22 — Platform admin `/admin` (create/manage clubs)

### Phase 3: Polish & Features
- [x] T23 — Platform `/courts` page with Leaflet map view
- [x] T24 — Platform `/classes` page
- [x] T25 — Demo data seed (9 HK clubs, 30 courts, 38 classes, coaches)
- [x] T26 — Account calendar view (weekly bookings, club filter)
- [x] T27 — Court grouping by club in list view
- [x] T28 — Auto-geocoding (address → lat/lng via Nominatim)
- [x] T29 — Map sidebar (desktop) + bottom drawer (mobile)
- [x] T30 — Homepage map section
- [x] T31 — Forgot password + reset flow
- [x] T32 — Profile edit on account page
- [x] T33 — Notification bell
- [x] T34 — 404 page
- [x] T35 — Replace all emojis with lucide-react SVG icons
- [x] T36 — Mobile-responsive bottom navigation (SVG icons)
- [x] T37 — Admin auth race condition fix (membership settled flag)
- [x] T38 — Consistent Chinese date format in calendar

## Backlog (Future)

- [ ] Email notifications (booking confirmation, class reminder)
- [ ] Push notifications
- [ ] Payment integration (Stripe / PayMe)
- [ ] Court photo upload
- [ ] Club logo/branding customization
- [ ] Recurring booking support
- [ ] Waitlist for full classes
- [ ] Coach availability calendar
- [ ] Multi-language support (EN/ZH toggle)
- [ ] SEO metadata per club
- [ ] PWA offline support
- [ ] Booking cancellation with refund policy
- [ ] Advanced analytics (revenue, utilization heatmap)
- [ ] API rate limiting
- [ ] Audit log for admin actions
