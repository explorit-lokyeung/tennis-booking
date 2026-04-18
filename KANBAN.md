# 🎾 Multi-Tenant Tennis Platform — Kanban

> Branch: `feature/multi-tenant`
> Auto-execution via Claude Code — minimal human intervention

---

## 📋 Backlog

_(everything in scope is Done — see below)_

---

## 🔜 Todo

_(nothing pending)_

---

## 🚧 In Progress

_(nothing currently in progress)_

---

## ✅ Done

- [x] T01: Create `clubs` table — migration 001 applied
- [x] T02: Create `club_memberships` table — migration 002 applied
- [x] T03: Add `club_id` FK to courts, classes, slots, bookings, class_bookings, settings — migration 003 applied
- [x] T04: Migration script — default club created, existing data backfilled, club_id set NOT NULL — migration 004 applied
- [x] T05: Rewrite RLS policies per club — migration 005 applied
- [x] T06: Replaced `profiles.is_admin` with `club_memberships.role` — `isClubAdmin()` + `getUserClubRole()` helpers in `lib/club.ts`; admin layout gates on `hasRole(membership, 'admin','owner')`
- [x] T07: Vercel deployment setup — removed `output:'export'`, `basePath:'/tennis-booking'`, `trailingSlash` from `next.config.ts`; scrubbed `/tennis-booking` paths from `sw.js`, `manifest.json`, `MobileNav`, `ClassDetailClient`, `layout.tsx`
- [x] T08: New URL structure — `/`, `/clubs`, `/clubs/[slug]`, `/clubs/[slug]/courts`, `/clubs/[slug]/classes`, `/clubs/[slug]/classes/[id]`, `/clubs/[slug]/admin/*`, `/account`
- [x] T09: Club homepage `/clubs/[slug]` — hero + join-flow, courts/classes preview with visibility badges, contact info, admin quick link
- [x] T10: Booking UI club-scoped — courts/classes pages filter by `club_id`, visibility gate applied, inserted rows carry `club_id`, account dashboard shows cross-club memberships + bookings
- [x] Phase 3 wiring: `lib/queries.ts` added; `app/page.tsx`, `app/clubs/page.tsx`, `app/clubs/[slug]/page.tsx` fetch from Supabase
- [x] T11: Club admin dashboard refactored with RLS — `/clubs/[slug]/admin` layout gates on `hasRole('admin','owner')`; every admin sub-page scopes queries to `club_id`; migration 005 `is_club_admin()` grants CRUD
- [x] T12: Member management UI — list with status filter tabs, approve/reject/suspend/remove actions, role change dropdown, invite-by-email (via `find_user_by_email` RPC). `find_users_by_ids` RPC added in migration 006 to resolve user names/emails in bulk
- [x] T13: Platform landing page `/` — hero, live platform stats bar (clubs/courts/classes), featured clubs grid, value-prop section, CTA for club owners
- [x] T14: Club directory `/clubs` — keyword search across name/address/description + HK area filter (港島/九龍/新界), per-area counts
- [x] T15: Cross-club user dashboard `/account` — memberships (approved + pending), upcoming vs past booking tabs, iCal export link, coach-mode hint card when user has coach memberships
- [x] T16: Google OAuth login — `signInWithOAuth({provider:'google'})` button on login page with origin-aware `redirectTo`
- [x] T17: Coach cross-club dashboard `/coach` — scoped to memberships where `role='coach'`, matches classes by coach name, shows per-class participant counts aggregated across clubs
- [x] T18: Coach invite flow — admin can invite/assign role='coach' directly in member management page dropdown (RLS policy `memberships_admin_insert` permits)
- [x] T19: Coach apply flow — club homepage join button now offers 「以教練身份申請」 which inserts a pending membership with role='coach'
- [x] T20: Attendance tracking — migration 007 adds `class_bookings.attended`, updates `get_class_participants` RPC to return it, adds coach UPDATE policy. Coach class detail page `/coach/classes/[id]` + admin class participants list now expose tap-to-toggle attendance
- [x] T21: Coach schedule view `/coach/schedule` — classes grouped by day of week, today highlighted, links to class attendance page
- [x] T22: Analytics dashboard `/clubs/[slug]/admin/analytics` — 7/30/90-day range selector, daily booking bars, per-court revenue bars, top classes by registrations, totals card
- [x] T23: Email notifications — migration 008 adds `notifications` queue table + triggers (`booking_confirmed`, `membership_approved`, `class_booking_confirmed`) that enqueue subject/body/payload rows. Worker/Edge Function to actually send emails is out of scope
- [x] T24: iCal export — `/api/ical?user_id=...` route emits VCALENDAR feed of confirmed bookings converted to UTC; `/account` exposes a download link
- [x] T25: Booking policy engine — `lib/policy.ts` + admin `/clubs/[slug]/admin/settings` page for `advance_days`, `advance_days_public`, `daily_limit`, `members_priority_hours`; booking page enforces advance window + daily limit with friendly errors

---

## 🔧 Execution Order

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12
T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24 → T25
```

## 📝 Notes

- Supabase project: `xtinvnccabizaweqyszz.supabase.co`
- Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjI4MDAsImV4cCI6MjA5MTk5ODgwMH0.eE5GKwPCw2qgK-4fs4_Lv7hX7zbxmjXXT2e98nFMvCI`
- Supabase service_role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQyMjgwMCwiZXhwIjoyMDkxOTk4ODAwfQ.3JN0UtFGPBvvbNiqKU7ie8i6FfDxlgnIUZ_cQbIM50g`
- Admin user: lok.yeung.hk@gmail.com (c87080df-1e1f-4765-a9f5-af832156e87a)
- Branch: feature/multi-tenant
- Design: Nike-inspired cream/black/gold, Traditional Chinese UI
- App path: /home/ubuntu/tennis-booking-app
- GitHub: explorit-lokyeung/tennis-booking
- HKT timezone for all dates; on-demand slot architecture (no row = available)
- Coach can teach at multiple clubs (same user, multiple `club_memberships` with role='coach')
- Club has full control: approve/reject members AND coaches

## 🗄️ Pending DB migrations (apply manually — psql over IPv6 blocked here)

These `supabase/migrations/*.sql` files were written during this run but have NOT been applied to the database. Apply in order via the Supabase SQL editor:

- `006_user_lookup_functions.sql` — `find_users_by_ids(UUID[])` for admin member list
- `007_attendance.sql` — `class_bookings.attended` column, updated `get_class_participants`, coach UPDATE policy
- `008_notifications.sql` — `notifications` queue table + triggers on bookings/memberships/class_bookings

Until these are applied:
- Members admin page falls back to showing `user_id` instead of name/email for each row
- Attendance toggles on coach + admin pages will fail silently (the column doesn't exist yet)
- No rows accumulate in `notifications`
