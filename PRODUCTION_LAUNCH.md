# 🎾 Tennis Platform — Production Launch Checklist

## 🔴 Must Fix Before Launch

### Auth & Security
- [ ] **Supabase Email Confirmation** — 決定開定關。開嘅話要設 SMTP（Supabase Dashboard → Auth → SMTP Settings）
- [ ] **Google OAuth redirect URL** — 喺 Google Cloud Console 加 production domain 做 authorized redirect URI
- [ ] **Supabase Auth redirect URL** — Dashboard → Auth → URL Configuration → 加 production domain
- [ ] **Remove service_role key from KANBAN.md** — 唔好 commit secrets 入 repo
- [ ] **環境變數** — Production Vercel 只需要 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Missing Features (Core)
- [ ] **Platform Admin Role** — 而家冇 "super admin" 概念，無法從 UI 建立新 Club。Options:
  - A) 建一個 `/admin` platform-level dashboard（需要新 role: platform_admin）
  - B) 暫時用 Supabase Dashboard 手動 INSERT clubs
- [ ] **Club Creation Flow** — self-service 或 admin-only
- [ ] **Email Notifications** — migration 008 建咗 notifications queue，但冇 worker 實際發 email。Options:
  - Supabase Edge Function + Resend/SendGrid
  - 或者暫時唔發 email，靠 in-app notifications

### Data Cleanup
- [ ] **移除 Demo Data** — launch 前 DELETE demo clubs/courts/classes（或者 keep 做 demo tenant）
- [ ] **移除 Demo Tennis Club** — 原本嘅 single-tenant data

---

## 🟡 Should Have (Launch Week)

### UX Improvements
- [ ] **Forgot Password flow** — Supabase Auth 有 built-in，需要加 UI
- [ ] **User Profile edit** — 改名、電話、頭像
- [ ] **404 / Error pages** — custom design
- [ ] **Loading states** — skeleton screens on slow connections
- [ ] **PWA / Service Worker** — 確保 sw.js 唔會 cache 舊版（加 version bump）

### Operations
- [ ] **Custom Domain** — Vercel Settings → Domains → 加你嘅 domain
- [ ] **Supabase Pro Plan** — free tier 有限制（500MB DB, 1GB bandwidth）
- [ ] **Vercel Analytics** — 開 Web Analytics 睇 traffic
- [ ] **Error Monitoring** — Sentry or similar

---

## 🟢 Nice to Have (Post-Launch)

- [ ] **WhatsApp / SMS notifications** — 香港用戶 prefer WhatsApp
- [ ] **Payment integration** — Stripe for booking fees
- [ ] **Waitlist** — 班滿時可以排隊
- [ ] **Recurring bookings** — 固定每週預約
- [ ] **Multi-language** — 英文版

---

## 📋 Current User Flows

### Flow 1: New Club Onboard
```
1. (目前) 直接 INSERT 入 Supabase DB
   INSERT INTO clubs (slug, name, description, address, ...) VALUES (...)
2. 設定 club settings (open/close hours, booking policy)
3. 指定第一個 admin:
   INSERT INTO club_memberships (club_id, user_id, role, status)
   VALUES ('...', '...', 'owner', 'approved')
4. Admin 登入 → /clubs/[slug]/admin → 加場地、加班
```
**建議改善：** 加 self-service 申請表或 platform admin UI

### Flow 2: New Member
```
1. 用戶去 /login → Register
2. 去 /clubs → 揀 club → 「加入球會」
3. Status = pending
4. Club admin 去 /clubs/[slug]/admin/members → Approve
5. Member 可以 book courts + join classes
```

### Flow 3: New Coach
```
Option A (自行申請):
1. 教練去 /clubs/[slug] → 「以教練身份申請」
2. Admin approve → role = coach

Option B (Admin 指派):
1. Admin 去 /clubs/[slug]/admin/members
2. 搵到用戶 → Change role → Coach
```

### Flow 4: Add Courts & Classes
```
1. Club admin 登入
2. /clubs/[slug]/admin/courts → 「新增場地」
3. /clubs/[slug]/admin/classes → 「新增課堂」
4. 設定時間、教練、價錢、名額、可見性
```

### Flow 5: Member Books a Court
```
1. 登入 → /clubs/[slug]/courts
2. 揀日期 → 揀場地 × 時段
3. 確認預約
4. 預約出現喺 /account calendar
```

### Flow 6: Member Joins a Class
```
1. 登入 → /clubs/[slug]/classes
2. 揀班 → 「報名」
3. 出現喺 /account calendar
```

### Flow 7: Daily Management (Admin)
```
1. /clubs/[slug]/admin — overview
2. /clubs/[slug]/admin/members — 審批新會員
3. /clubs/[slug]/admin/courts — 管理場地
4. /clubs/[slug]/admin/classes — 管理課堂
5. /clubs/[slug]/admin/analytics — 查看數據
6. /clubs/[slug]/admin/settings — booking policy
```
