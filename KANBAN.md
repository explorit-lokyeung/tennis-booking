# 🎾 Multi-Tenant Tennis Platform — Kanban

> Branch: `feature/multi-tenant`
> Auto-execution via Claude Code — minimal human intervention

---

## 📋 Backlog

### Phase 5: Platform Pages (P1)
- [ ] T13: Platform landing page (/) — club discovery, featured clubs
- [ ] T14: Club directory page (/clubs) — search, filter by area
- [ ] T15: User cross-club dashboard — all memberships + bookings
- [ ] T16: Google OAuth login option

### Phase 6: Coach Features (P2)
- [ ] T17: Coach cross-club dashboard (/coach)
- [ ] T18: Coach invite flow (admin invites coach)
- [ ] T19: Coach apply to club flow
- [ ] T20: Attendance tracking for classes
- [ ] T21: Coach schedule view (today's classes across clubs)

### Phase 7: Advanced (P2)
- [ ] T22: Analytics dashboard (utilization, revenue)
- [ ] T23: Email notifications (booking confirm, membership approved)
- [ ] T24: iCal export for bookings
- [ ] T25: Booking policy engine (members priority, advance days, daily limits)

---

## 🔜 Todo

### Phase 4: Club Admin & Membership (P0)
- [ ] T11: Club admin dashboard refactor (scoped to club_id)
- [ ] T12: Member management UI (list, approve, reject, suspend, roles)

---

## 🚧 In Progress

### Phase 1: DB Schema (P0)
- [ ] T01: Create `clubs` table
- [ ] T02: Create `club_memberships` table (user ↔ club, role, status)
- [ ] T03: Add `club_id` FK to `courts`, `classes`, `slots`, `bookings`, `class_bookings`, `settings`
- [ ] T04: Migration script — create default club, migrate existing data

### Phase 2: RLS & Auth (P0)
- [ ] T05: Rewrite RLS policies per club (view, book, admin, coach)
- [ ] T06: Replace `profiles.is_admin` with `club_memberships.role` checks

### Phase 3: Routing & Pages (P0)
- [ ] T08: New URL structure — `/clubs/[slug]/courts`, `/clubs/[slug]/classes`, etc.
- [ ] T09: Club profile/homepage (`/clubs/[slug]`)
- [ ] T10: Refactor booking UI to be club-scoped

---

## ✅ Done

- [x] T07: Vercel deployment setup — removed `output:'export'`, `basePath:'/tennis-booking'`, `trailingSlash` from `next.config.ts`; scrubbed `/tennis-booking` paths from `sw.js`, `manifest.json`, `MobileNav`, `ClassDetailClient`, `layout.tsx`

---

## 🔧 Execution Order

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12
 │     │     │     │     │     │     │     │     │     │      │      │
 DB    DB    DB   Migrate RLS  Auth  Deploy Route Club  Book   Admin  Members
```

**Phase 1-2 (DB + RLS):** T01–T06 — Foundation, must be first
**Phase 3 (Routing):** T07–T10 — New URL structure + Vercel
**Phase 4 (Admin):** T11–T12 — Club-scoped admin
**Phase 5-7:** P1/P2 features, iterate after MVP

## 📝 Notes

- Supabase project: `xtinvnccabizaweqyszz.supabase.co`
- Supabase anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjI4MDAsImV4cCI6MjA5MTk5ODgwMH0.eE5GKwPCw2qgK-4fs4_Lv7hX7zbxmjXXT2e98nFMvCI`
- Supabase service_role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQyMjgwMCwiZXhwIjoyMDkxOTk4ODAwfQ.3JN0UtFGPBvvbNiqKU7ie8i6FfDxlgnIUZ_cQbIM50g`
- Admin user: lok.yeung.hk@gmail.com (c87080df-1e1f-4765-a9f5-af832156e87a)
- Current DB tables: courts, slots, classes, bookings, class_bookings, profiles, settings
- Current DB functions: find_user_by_email(), get_class_participants()
- Branch: feature/multi-tenant
- Design: Nike-inspired cream/black/gold, Traditional Chinese UI
- App path: /home/ubuntu/tennis-booking-app
- GitHub: explorit-lokyeung/tennis-booking
- On-demand slot architecture: no row = available
- HKT timezone for all dates
- Coach can teach at multiple clubs (same user, multiple club_memberships with role='coach')
- Club has full control: approve/reject members AND coaches
