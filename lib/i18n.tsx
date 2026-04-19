'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type Locale = 'zh' | 'en';

const translations: Record<string, Record<Locale, string>> = {
  // Nav
  'nav.home': { zh: '首頁', en: 'Home' },
  'nav.clubs': { zh: '球會', en: 'Clubs' },
  'nav.courts': { zh: '球場', en: 'Courts' },
  'nav.classes': { zh: '課程', en: 'Classes' },
  'nav.account': { zh: '我的', en: 'Account' },
  'nav.login': { zh: '登入', en: 'Login' },
  'nav.logout': { zh: '登出', en: 'Logout' },

  // Hero
  'hero.title': { zh: '香港網球會預約平台', en: 'Hong Kong Tennis Club Booking' },
  'hero.subtitle': { zh: '發掘香港嘅網球會。預約球場，報名課堂，由一個地方開始。', en: 'Discover tennis clubs in Hong Kong. Book courts, enroll in classes, all in one place.' },
  'hero.browse': { zh: '瀏覽所有球會', en: 'Browse Clubs' },
  'hero.courts': { zh: '球場地圖', en: 'Court Map' },
  'hero.classes': { zh: '所有課程', en: 'All Classes' },

  // Stats
  'stats.clubs': { zh: '球會', en: 'Clubs' },
  'stats.courts': { zh: '球場', en: 'Courts' },
  'stats.classes': { zh: '課程', en: 'Classes' },

  // Featured
  'featured.title': { zh: '精選球會', en: 'Featured Clubs' },
  'featured.subtitle': { zh: '加入社群，隨時揮拍', en: 'Join a community, play anytime' },
  'featured.viewAll': { zh: '查看全部 →', en: 'View All →' },
  'featured.empty': { zh: '暫時未有球會', en: 'No clubs yet' },

  // Map
  'map.title': { zh: '球場位置', en: 'Court Locations' },
  'map.viewAll': { zh: '查看全部 →', en: 'View All →' },
  'map.clubs': { zh: '個球會', en: 'clubs' },
  'map.courts': { zh: '個球場', en: 'courts' },

  // Value props
  'value.title': { zh: '點解揀我哋', en: 'Why Choose Us' },
  'value.multiClub': { zh: '多個球會，一個帳戶', en: 'Multiple clubs, one account' },
  'value.multiClubDesc': { zh: '一次登入，管理你喺唔同球會嘅會籍同預約。', en: 'One login to manage memberships and bookings across clubs.' },
  'value.instant': { zh: '即時預約', en: 'Instant Booking' },
  'value.instantDesc': { zh: '睇到可用時段即刻book，唔駛等電話通知。', en: 'See available slots and book instantly. No waiting for callbacks.' },
  'value.coach': { zh: '專業教練', en: 'Pro Coaching' },
  'value.coachDesc': { zh: '由初級到高級，搵到適合你嘅課程。', en: 'From beginner to advanced, find the right class for you.' },

  // Common
  'common.loading': { zh: '載入中...', en: 'Loading...' },
  'common.save': { zh: '儲存', en: 'Save' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.confirm': { zh: '確認', en: 'Confirm' },
  'common.delete': { zh: '刪除', en: 'Delete' },
  'common.viewClub': { zh: '查看球會 →', en: 'View Club →' },
  'common.join': { zh: '加入球會', en: 'Join Club' },
  'common.indoor': { zh: '室內', en: 'Indoor' },
  'common.outdoor': { zh: '室外', en: 'Outdoor' },

  // Booking
  'booking.title': { zh: '球場預約', en: 'Court Booking' },
  'booking.preview': { zh: '你當前為預覽模式。', en: 'You are in preview mode.' },
  'booking.loginFirst': { zh: '登入並加入球會後即可預約。', en: 'Login and join the club to book.' },
  'booking.joinFirst': { zh: '請先加入球會成為會員後才可預約。', en: 'Please join the club first to book.' },
  'booking.confirm': { zh: '確認預約', en: 'Confirm Booking' },
  'booking.success': { zh: '預約成功！', en: 'Booking Confirmed!' },
  'booking.total': { zh: '總計', en: 'Total' },
  'booking.perHour': { zh: '/小時', en: '/hour' },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || 'zh';
    }
    return 'zh';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('locale', l);
  }, []);

  const t = useCallback((key: string) => {
    return translations[key]?.[locale] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() { return useContext(I18nContext); }
