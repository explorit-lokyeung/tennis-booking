/**
 * Input validation utilities for server and client-side use.
 */

export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-+()]{6,20}$/,
  slug: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
  url: /^https?:\/\/.+/,
  name: /^.{1,100}$/,
  password: /^.{8,}$/,  // minimum 8 chars
};

export function validateEmail(email: string): string | null {
  if (!email) return '電郵不能為空';
  if (!VALIDATION.email.test(email)) return '電郵格式不正確';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '密碼不能為空';
  if (password.length < 8) return '密碼最少 8 個字元';
  if (!/[A-Z]/.test(password)) return '密碼需要包含至少一個大寫字母';
  if (!/[0-9]/.test(password)) return '密碼需要包含至少一個數字';
  return null;
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Slug 不能為空';
  if (slug.length < 2) return 'Slug 最少 2 個字元';
  if (slug.length > 50) return 'Slug 最多 50 個字元';
  if (!VALIDATION.slug.test(slug)) return 'Slug 只可以用小寫字母、數字同連字號';
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null; // optional
  if (!VALIDATION.phone.test(phone)) return '電話號碼格式不正確';
  return null;
}

export function validateUrl(url: string): string | null {
  if (!url) return null; // optional
  if (!VALIDATION.url.test(url)) return 'URL 格式不正確（需要 http:// 或 https://）';
  return null;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}
