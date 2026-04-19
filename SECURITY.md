# Security Checklist — Tennis Booking Platform

## Implemented

### Authentication & Authorization
- [x] **Supabase Auth** — bcrypt password hashing, JWT tokens
- [x] **Row Level Security (RLS)** — all tables have RLS policies
- [x] **Role-based access** — owner/admin/coach/member roles per club
- [x] **is_club_admin()** — SECURITY DEFINER function avoids RLS chicken-and-egg
- [x] **Platform admin** — separate `platform_admin` role in user metadata
- [x] **Password validation** — min 8 chars, uppercase + number required (client-side)
- [x] **Email validation** — regex check on client

### Transport & Headers
- [x] **HTTPS** — enforced by Vercel
- [x] **HSTS** — Strict-Transport-Security header (63072000s, includeSubDomains, preload)
- [x] **X-Frame-Options** — SAMEORIGIN (clickjacking protection)
- [x] **X-Content-Type-Options** — nosniff (MIME sniffing protection)
- [x] **X-XSS-Protection** — 1; mode=block
- [x] **Referrer-Policy** — strict-origin-when-cross-origin
- [x] **Permissions-Policy** — camera/microphone disabled, geolocation self only

### Input & Injection
- [x] **XSS prevention** — React auto-escapes JSX output
- [x] **SQL injection** — Supabase uses parameterized queries
- [x] **Input sanitization** — lib/validation.ts with sanitizeInput()
- [x] **CSRF** — Next.js built-in SameSite cookie protection

### Rate Limiting
- [x] **Middleware rate limiter** — per-IP, per-route limits
  - Login: 10 req/min
  - Password reset: 5 req/min
  - API: 60 req/min
  - Default: 120 req/min
- [x] **429 responses** with Retry-After header

### Data Protection
- [x] **Soft delete** — bookings/class_bookings use status='cancelled' (audit trail)
- [x] **Audit logging** — admin actions logged via lib/audit.ts → notifications table
- [x] **Environment variables** — no hardcoded credentials in code
- [x] **Separate environments** — staging (demo data) vs production (clean)

### Booking Security
- [x] **Membership check** — non-members can only preview, not book
- [x] **Cancellation deadline** — 2hr for courts, 24hr for classes
- [x] **Daily booking limit** — configurable per club
- [x] **Advance window** — configurable days + morning open hour

## Manual Steps Required (Supabase Dashboard)

### Email Confirmation
1. Dashboard → Authentication → Settings
2. Enable "Confirm email" toggle
3. Configure SMTP (Settings → Authentication → SMTP Settings):
   - Use Resend, SendGrid, or Mailgun
   - Set from address to your domain

### Password Policy
1. Dashboard → Authentication → Settings → Password
2. Set minimum length: 8
3. Enable "Require uppercase"
4. Enable "Require numbers"

### Auth Redirect URLs
1. Dashboard → Authentication → URL Configuration
2. Site URL: `https://your-production-domain.com`
3. Redirect URLs:
   - `https://your-production-domain.com/**`
   - `https://tennis-booking-prod.vercel.app/**`

### API Keys
1. Dashboard → Settings → API
2. **Never expose service_role key** in client code
3. Rotate keys if they were ever committed to git

## Future Improvements

- [ ] **Redis rate limiting** — replace in-memory with Upstash Redis for multi-instance
- [ ] **CSP header** — Content-Security-Policy (complex with inline styles from Tailwind)
- [ ] **2FA** — Supabase supports TOTP MFA
- [ ] **Session timeout** — auto-logout after inactivity
- [ ] **IP allowlist** — for admin routes
- [ ] **Webhook signatures** — for any external integrations
- [ ] **Penetration testing** — professional security audit
- [ ] **GDPR compliance** — data export/deletion for users
- [ ] **Logging** — centralized security event logging (Datadog/Sentry)
