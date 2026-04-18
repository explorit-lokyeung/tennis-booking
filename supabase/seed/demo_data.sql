-- =============================================================================
-- Demo / seed data for the multi-tenant tennis platform
-- =============================================================================
--
-- Idempotent: safe to re-run. Uses stable UUIDs for each clubs/courts/classes
-- so repeated runs update in place instead of duplicating rows.
--
-- Scope
--   • 8 Hong Kong clubs (港島 / 九龍 / 新界)  with lat/lng in settings JSONB
--   • 2-4 courts per club (mix of hard / clay / artificial grass, indoor/outdoor)
--   • 10 coaches (some teach at multiple clubs)
--   • ~28 classes (mix of levels, visibility, weekday/weekend schedules)
--   • Booking policies / operating hours per club
--   • Admin user (lok.yeung.hk@gmail.com) given owner/admin role across clubs
--   • Class bookings + court slot bookings for the admin user (demo fill)
--
-- Members
--   auth.users rows cannot be inserted directly from SQL (Supabase Auth owns
--   that table). The admin user c87080df-1e1f-4765-a9f5-af832156e87a already
--   exists and is reused across clubs below. Additional test members should be
--   created via the app's signup flow, then added to club_memberships via the
--   admin member-management UI.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Clubs
-- -----------------------------------------------------------------------------
-- We use deterministic UUIDs to make every downstream row idempotent.
-- settings.{lat,lng} are consumed by the /courts map view.

INSERT INTO clubs (id, slug, name, description, address, phone, email, settings, is_active)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'sha-tin',
    '沙田網球中心',
    '位於沙田源禾路，毗鄰城門河畔。設有六個室外硬地場及兩個室內場，全日營業。場內亦設有教練及教室，歡迎所有程度球員加入。',
    '新界沙田區源禾路 2 號',
    '2691-5156',
    'info@shatin-tennis.hk',
    jsonb_build_object(
      'lat', 22.3817, 'lng', 114.1894,
      'open_hour', 7, 'close_hour', 23,
      'advance_days', 7, 'advance_days_public', 3,
      'daily_limit', 2, 'members_priority_hours', 18
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'victoria-park',
    '維多利亞公園網球場',
    '銅鑼灣維多利亞公園旁嘅老牌網球場，歷史悠久，設施齊全。十四個硬地場隨時開放，一向都係港島球員嘅首選。',
    '香港島銅鑼灣興發街 1 號',
    '2570-6186',
    'hello@vptennis.hk',
    jsonb_build_object(
      'lat', 22.2826, 'lng', 114.1883,
      'open_hour', 7, 'close_hour', 22,
      'advance_days', 7, 'advance_days_public', 3,
      'daily_limit', 2
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'tko-academy',
    '將軍澳網球學院',
    '全新室內場館，配備智能球速追蹤系統同高清錄影回放。重點培訓青少年及成人進階班。',
    '新界將軍澳唐德街 9 號',
    '3145-6789',
    'coach@tko-tennis.hk',
    jsonb_build_object(
      'lat', 22.3075, 'lng', 114.2609,
      'open_hour', 8, 'close_hour', 23,
      'advance_days', 14, 'advance_days_public', 5,
      'daily_limit', 3
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'kowloon-tong',
    '九龍仔網球會',
    '座落九龍塘嘅私人會所。環境優雅，四個人造草場同兩個硬地場，會員獨享禮賓服務同餐飲設施。',
    '九龍九龍塘龍崗道 13A',
    '2336-1111',
    'reception@kltennis.hk',
    jsonb_build_object(
      'lat', 22.3382, 'lng', 114.1729,
      'open_hour', 7, 'close_hour', 22,
      'advance_days', 14, 'advance_days_public', 0,
      'daily_limit', 2
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'deep-water-bay',
    '深水灣網球會',
    '港島南區歷史最悠久嘅網球會之一，海景球場獨一無二。提供紅土場訓練，冬季更有職業球手巡訪。',
    '香港島深水灣道 19 號',
    '2812-7788',
    'members@dwb-tennis.hk',
    jsonb_build_object(
      'lat', 22.2411, 'lng', 114.1847,
      'open_hour', 7, 'close_hour', 21,
      'advance_days', 14, 'advance_days_public', 0,
      'daily_limit', 1
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'wong-tai-sin',
    '黃大仙網球場',
    '公營社區網球場。價錢親民，六個硬地場可供市民預約。適合初學者及家庭運動。',
    '九龍黃大仙蒲崗村道 180 號',
    '2326-2900',
    'bookings@wts-tennis.gov.hk',
    jsonb_build_object(
      'lat', 22.3438, 'lng', 114.2012,
      'open_hour', 7, 'close_hour', 22,
      'advance_days', 5, 'advance_days_public', 5,
      'daily_limit', 1
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    'tuen-mun',
    '屯門網球中心',
    '屯門友愛區嘅中型網球中心，設四個室外硬地場。區內最活躍嘅青少年網球培訓基地之一。',
    '新界屯門友愛路 21 號',
    '2450-8266',
    'info@tuenmun-tennis.hk',
    jsonb_build_object(
      'lat', 22.3893, 'lng', 113.9725,
      'open_hour', 7, 'close_hour', 22,
      'advance_days', 7, 'advance_days_public', 3,
      'daily_limit', 2
    ),
    true
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    'tai-po',
    '大埔網球場',
    '大埔完善公園內的社區網球場，環境清幽。兩個硬地場加夜間照明，適合放工後打波。',
    '新界大埔完善路 12 號',
    '2653-0300',
    'taipo@hktennis.hk',
    jsonb_build_object(
      'lat', 22.4502, 'lng', 114.1712,
      'open_hour', 7, 'close_hour', 22,
      'advance_days', 5, 'advance_days_public', 5,
      'daily_limit', 1
    ),
    true
  )
ON CONFLICT (id) DO UPDATE SET
  slug        = EXCLUDED.slug,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  address     = EXCLUDED.address,
  phone       = EXCLUDED.phone,
  email       = EXCLUDED.email,
  settings    = EXCLUDED.settings,
  is_active   = EXCLUDED.is_active,
  updated_at  = NOW();


-- -----------------------------------------------------------------------------
-- 2. Courts
-- -----------------------------------------------------------------------------
-- Surface values stay English ('Hard' / 'Clay' / 'Artificial Grass') so the
-- existing court-booking page can match them, while the /courts UI maps those
-- to Traditional Chinese labels.

INSERT INTO courts (id, club_id, name, surface, indoor, hourly_rate, description, location)
VALUES
  -- Sha Tin (1)
  ('20000000-0001-0001-0000-000000000001', '10000000-0000-0000-0000-000000000001', '1 號場', 'Hard',              false, 90,  '室外標準硬地場，配夜間泛光燈。', '源禾路主場 A'),
  ('20000000-0001-0001-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2 號場', 'Hard',              false, 90,  '室外標準硬地場。',                 '源禾路主場 A'),
  ('20000000-0001-0001-0000-000000000003', '10000000-0000-0000-0000-000000000001', '室內 A', 'Hard',              true,  180, '冷氣室內場，雨天首選。',           '副館 1 樓'),
  ('20000000-0001-0001-0000-000000000004', '10000000-0000-0000-0000-000000000001', '室內 B', 'Hard',              true,  180, '冷氣室內場。',                     '副館 1 樓'),

  -- Victoria Park (2)
  ('20000000-0002-0002-0000-000000000001', '10000000-0000-0000-0000-000000000002', '中央球場', 'Hard',            false, 85,  '維園主場，近地鐵站。',             '近銅鑼灣入口'),
  ('20000000-0002-0002-0000-000000000002', '10000000-0000-0000-0000-000000000002', '3 號場',   'Hard',            false, 75,  '標準硬地場。',                     '第二區'),
  ('20000000-0002-0002-0000-000000000003', '10000000-0000-0000-0000-000000000002', '4 號場',   'Hard',            false, 75,  '標準硬地場。',                     '第二區'),

  -- TKO Academy (3)
  ('20000000-0003-0003-0000-000000000001', '10000000-0000-0000-0000-000000000003', '智能場 1', 'Hard',            true,  220, '配備球速追蹤系統及高清錄影。',     '學院主館'),
  ('20000000-0003-0003-0000-000000000002', '10000000-0000-0000-0000-000000000003', '智能場 2', 'Hard',            true,  220, '配備球速追蹤系統。',               '學院主館'),
  ('20000000-0003-0003-0000-000000000003', '10000000-0000-0000-0000-000000000003', '訓練場 A', 'Hard',            true,  160, '青少年訓練場。',                   '學院副館'),

  -- Kowloon Tong (4)
  ('20000000-0004-0004-0000-000000000001', '10000000-0000-0000-0000-000000000004', '草場 1',  'Artificial Grass', false, 200, '人造草場，舒適低衝擊。',           '會所東翼'),
  ('20000000-0004-0004-0000-000000000002', '10000000-0000-0000-0000-000000000004', '草場 2',  'Artificial Grass', false, 200, '人造草場。',                       '會所東翼'),
  ('20000000-0004-0004-0000-000000000003', '10000000-0000-0000-0000-000000000004', '硬地場 1','Hard',             false, 180, '會員專用硬地場。',                 '會所西翼'),

  -- Deep Water Bay (5)
  ('20000000-0005-0005-0000-000000000001', '10000000-0000-0000-0000-000000000005', '海景紅土 A', 'Clay',          false, 260, '紅土場，海景一絕。',               '主場區'),
  ('20000000-0005-0005-0000-000000000002', '10000000-0000-0000-0000-000000000005', '海景紅土 B', 'Clay',          false, 260, '紅土場。',                         '主場區'),
  ('20000000-0005-0005-0000-000000000003', '10000000-0000-0000-0000-000000000005', '硬地場 1',   'Hard',          false, 220, '標準硬地場。',                     '副場區'),

  -- Wong Tai Sin (6)
  ('20000000-0006-0006-0000-000000000001', '10000000-0000-0000-0000-000000000006', '1 號場', 'Hard', false, 60, '公營硬地場。',             '蒲崗村道入口'),
  ('20000000-0006-0006-0000-000000000002', '10000000-0000-0000-0000-000000000006', '2 號場', 'Hard', false, 60, '公營硬地場。',             '蒲崗村道入口'),
  ('20000000-0006-0006-0000-000000000003', '10000000-0000-0000-0000-000000000006', '3 號場', 'Hard', false, 60, '公營硬地場，配夜間泛光燈。', '第二區'),

  -- Tuen Mun (7)
  ('20000000-0007-0007-0000-000000000001', '10000000-0000-0000-0000-000000000007', '1 號場', 'Hard', false, 70, '室外硬地場。',       '友愛路主場'),
  ('20000000-0007-0007-0000-000000000002', '10000000-0000-0000-0000-000000000007', '2 號場', 'Hard', false, 70, '室外硬地場。',       '友愛路主場'),
  ('20000000-0007-0007-0000-000000000003', '10000000-0000-0000-0000-000000000007', '3 號場', 'Hard', false, 70, '室外硬地場，夜間開放。', '友愛路副場'),

  -- Tai Po (8)
  ('20000000-0008-0008-0000-000000000001', '10000000-0000-0000-0000-000000000008', '1 號場', 'Hard', false, 55, '公園硬地場。',           '完善公園內'),
  ('20000000-0008-0008-0000-000000000002', '10000000-0000-0000-0000-000000000008', '2 號場', 'Hard', false, 55, '公園硬地場，夜間開放。', '完善公園內')
ON CONFLICT (id) DO UPDATE SET
  club_id     = EXCLUDED.club_id,
  name        = EXCLUDED.name,
  surface     = EXCLUDED.surface,
  indoor      = EXCLUDED.indoor,
  hourly_rate = EXCLUDED.hourly_rate,
  description = EXCLUDED.description,
  location    = EXCLUDED.location;


-- -----------------------------------------------------------------------------
-- 3. Settings (per-club operating hours + booking policy)
-- -----------------------------------------------------------------------------
-- The booking policy helper (lib/policy.ts) reads these from the `settings`
-- table, so we mirror what's in the clubs.settings JSONB here. We also keep the
-- JSONB so UI code that reads club.settings keeps working.
--
-- settings table uses (club_id, key, value) tuples. Composite uniqueness is not
-- declared in the current schema, so we clear existing rows for our demo clubs
-- first then re-insert.

DELETE FROM settings
WHERE club_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008'
);

INSERT INTO settings (club_id, key, value)
SELECT c.id, k.key, k.value
FROM clubs c
CROSS JOIN LATERAL (
  VALUES
    ('open_hour',             COALESCE(c.settings->>'open_hour', '7')),
    ('close_hour',            COALESCE(c.settings->>'close_hour', '22')),
    ('advance_days',          COALESCE(c.settings->>'advance_days', '7')),
    ('advance_days_public',   COALESCE(c.settings->>'advance_days_public', '3')),
    ('daily_limit',           COALESCE(c.settings->>'daily_limit', '2')),
    ('members_priority_hours', COALESCE(c.settings->>'members_priority_hours', '0'))
) AS k(key, value)
WHERE c.id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008'
);


-- -----------------------------------------------------------------------------
-- 4. Classes
-- -----------------------------------------------------------------------------
-- Coaches are stored as free-text on classes.coach, so cross-club coaching is
-- modelled by reusing the same coach name across multiple clubs.
--
-- Named coach roster (referenced below):
--   Coach Chan Ka Ming         (初級 / 兒童, multi-club: Sha Tin + Wong Tai Sin + Tai Po)
--   Coach Wong Siu Fung        (中級, Victoria Park + Kowloon Tong)
--   Coach Leung Yuen Ting      (高級, Deep Water Bay + TKO)
--   Coach Ho Chun Yin          (兒童, Wong Tai Sin + Tuen Mun + Sha Tin)
--   Coach Tsui Ka Wai          (成人入門, Victoria Park + Tuen Mun)
--   Coach Yip Wing Shan        (女子班, Kowloon Tong + Deep Water Bay)
--   Coach Lam Cho Yiu          (青少年競賽, TKO)
--   Coach Cheng Pui Yi         (初中級混合, Sha Tin + Tai Po)
--   Coach Ng Tsz Lok           (體能/技術, Tuen Mun + TKO)
--   Coach Fung Hei Man         (進階技術, Victoria Park + Deep Water Bay)

INSERT INTO classes (id, club_id, name, coach, coach_bio, level, day, time, duration, location, spots_available, spots_total, price, description, visible, start_date, end_date)
VALUES
  -- Sha Tin (4 classes)
  ('30000000-0001-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '週一兒童初班',     'Coach Chan Ka Ming', '前港隊成員，十五年教學經驗',  '初級',     'Monday',    '4:30 PM - 5:30 PM', '1小時', '1 號場', 6,  8,  280, '專為 6-10 歲小朋友設計，著重基本揮拍同樂趣。', true, '2026-04-01', '2026-06-30'),
  ('30000000-0001-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '週二成人初班',     'Coach Chan Ka Ming', '前港隊成員，十五年教學經驗',  '初級',     'Tuesday',   '7:00 PM - 8:30 PM', '1.5小時', '2 號場', 4,  8,  350, '零基礎成人適用，打好基本功。',                 true, '2026-04-01', '2026-06-30'),
  ('30000000-0001-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '週六混合班',       'Coach Cheng Pui Yi', 'ITF 認證教練，專注成人訓練',  '中級', 'Saturday',  '9:00 AM - 11:00 AM', '2小時','室內 A', 5,  10, 420, '初中級混合對打，教練即場糾正動作。',           true, '2026-04-01', '2026-06-30'),
  ('30000000-0001-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '私人進階班',       'Coach Ho Chun Yin', '體院出身，專攻青少年培訓',   '高級',     'Thursday',  '8:00 PM - 9:30 PM', '1.5小時', '室內 B', 2,  4,  680, '限四人小班，針對比賽技術。',                   true, '2026-04-01', '2026-06-30'),

  -- Victoria Park (4 classes)
  ('30000000-0002-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '維園成人入門',     'Coach Tsui Ka Wai', '社區教練，推廣基層網球',   '初級',     'Wednesday', '7:30 PM - 9:00 PM', '1.5小時', '中央球場', 6, 10, 320, '港島最抵玩成人班，歡迎新手。',                  true, '2026-04-01', '2026-07-30'),
  ('30000000-0002-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '維園中級班',       'Coach Wong Siu Fung', '前大學校隊教練，技術分析專家', '中級', 'Monday',    '7:00 PM - 9:00 PM', '2小時', '3 號場',   4, 8,  380, '著重底線穩定同步法移動。',                     true, '2026-04-01', '2026-07-30'),
  ('30000000-0002-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '週日家庭同樂班',   'Coach Tsui Ka Wai', '社區教練，推廣基層網球',   '初級',     'Sunday',    '10:00 AM - 11:30 AM', '1.5小時','4 號場',  7, 12, 260, '親子一齊玩網球。',                             true, '2026-04-01', '2026-07-30'),
  ('30000000-0002-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '週五進階技術',     'Coach Fung Hei Man', '體能教練兼網球教練',  '高級',     'Friday',    '8:00 PM - 9:30 PM', '1.5小時', '中央球場', 3, 6,  520, '針對發球、上網、切削技巧。',                   true, '2026-04-01', '2026-07-30'),

  -- TKO Academy (4 classes)
  ('30000000-0003-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '學院青少年精英',   'Coach Lam Cho Yiu', '前亞運代表，精英培訓導師',   '高級',     'Tuesday',   '5:00 PM - 7:00 PM', '2小時', '智能場 1', 4,  8,  580, '比賽導向培訓，配球速追蹤。',                   true, '2026-04-01', '2026-12-31'),
  ('30000000-0003-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '學院青少年精英',   'Coach Lam Cho Yiu', '前亞運代表，精英培訓導師',   '高級',     'Thursday',  '5:00 PM - 7:00 PM', '2小時', '智能場 1', 3,  8,  580, '比賽導向培訓，配球速追蹤。',                   true, '2026-04-01', '2026-12-31'),
  ('30000000-0003-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '學院成人高級班',   'Coach Leung Yuen Ting', '紅土專家，曾於歐洲執教','高級',     'Saturday',  '2:00 PM - 4:00 PM', '2小時', '智能場 2', 2,  6,  620, '高級成人，著重戰術應用。',                     true, '2026-04-01', '2026-12-31'),
  ('30000000-0003-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', '體能技術融合',     'Coach Ng Tsz Lok', '運動科學碩士，體能技術結合',    '中級', 'Sunday',    '9:00 AM - 11:00 AM', '2小時','訓練場 A', 5,  10, 460, '體能訓練加技術練習。',                         true, '2026-04-01', '2026-12-31'),

  -- Kowloon Tong (4 classes, mostly members-only)
  ('30000000-0004-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '會員中級班',       'Coach Wong Siu Fung', '前大學校隊教練，技術分析專家', '中級', 'Tuesday',   '7:00 PM - 9:00 PM', '2小時', '草場 1',   4, 8,  480, '會員專享中級班，草場訓練。',                   true, '2026-04-01', '2026-09-30'),
  ('30000000-0004-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '女子俱樂部班',     'Coach Yip Wing Shan', '女子網球專家，WTA 認證教練', '中級', 'Thursday',  '10:00 AM - 11:30 AM', '1.5小時','草場 2', 3, 8,  420, '女士專屬訓練，輕鬆交流。',                     true, '2026-04-01', '2026-09-30'),
  ('30000000-0004-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '會員內部私教',     'Coach Wong Siu Fung', '前大學校隊教練，技術分析專家', '高級',     'Saturday',  '7:00 AM - 9:00 AM', '1.5小時', '硬地場 1', 0, 2,  950, '只限指定會員。',                               true, '2026-04-01', '2026-09-30'),
  ('30000000-0004-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '兒童入門班',       'Coach Yip Wing Shan', '女子網球專家，WTA 認證教練', '初級',     'Saturday',  '9:30 AM - 10:30 AM', '1小時','草場 1',   8, 10, 360, '4-8 歲小朋友親身體驗網球。',                   true, '2026-04-01', '2026-09-30'),

  -- Deep Water Bay (3 classes, premium)
  ('30000000-0005-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '紅土高級班',       'Coach Leung Yuen Ting', '紅土專家，曾於歐洲執教','高級',     'Wednesday', '7:30 AM - 9:00 AM', '1.5小時', '海景紅土 A', 3, 6,  780, '體驗歐洲式紅土訓練，小班教學。',               true, '2026-04-01', '2026-10-31'),
  ('30000000-0005-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '海景女子班',       'Coach Yip Wing Shan', '女子網球專家，WTA 認證教練', '中級', 'Friday',    '9:30 AM - 11:00 AM', '1.5小時','海景紅土 B', 2, 6,  720, '女士會員班，邊打邊睇海。',                     true, '2026-04-01', '2026-10-31'),
  ('30000000-0005-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', '週末進階',         'Coach Fung Hei Man', '體能教練兼網球教練',  '高級',     'Saturday',  '4:00 PM - 6:00 PM', '2小時', '硬地場 1',   4, 8,  650, '進階戰術同發球訓練。',                         true, '2026-04-01', '2026-10-31'),

  -- Wong Tai Sin (3 classes, community)
  ('30000000-0006-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', '社區兒童班',       'Coach Ho Chun Yin', '體院出身，專攻青少年培訓',   '初級',     'Saturday',  '10:00 AM - 11:30 AM', '1.5小時','1 號場',   9, 12, 180, '社區推廣價，7-12 歲。',                        true, '2026-04-01', '2026-08-31'),
  ('30000000-0006-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', '社區成人入門',     'Coach Chan Ka Ming', '前港隊成員，十五年教學經驗',  '初級',     'Wednesday', '8:00 PM - 9:30 PM', '1.5小時', '2 號場',   7, 12, 180, '成人零基礎適用。',                             true, '2026-04-01', '2026-08-31'),
  ('30000000-0006-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', '青少年週末班',     'Coach Ho Chun Yin', '體院出身，專攻青少年培訓',   '中級', 'Sunday',    '2:00 PM - 4:00 PM', '2小時', '3 號場',   6, 10, 220, '12-16 歲青少年進階。',                         true, '2026-04-01', '2026-08-31'),

  -- Tuen Mun (3 classes)
  ('30000000-0007-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', '屯門兒童班',       'Coach Ho Chun Yin', '體院出身，專攻青少年培訓',   '初級',     'Monday',    '4:30 PM - 5:30 PM', '1小時', '1 號場', 5,  8,  260, '屯門區兒童入門班。',                           true, '2026-04-01', '2026-07-31'),
  ('30000000-0007-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', '屯門成人入門',     'Coach Tsui Ka Wai', '社區教練，推廣基層網球',   '初級',     'Thursday',  '7:30 PM - 9:00 PM', '1.5小時', '2 號場', 4,  8,  300, '放工後成人班。',                               true, '2026-04-01', '2026-07-31'),
  ('30000000-0007-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', '屯門體能強化',     'Coach Ng Tsz Lok', '運動科學碩士，體能技術結合',    '中級', 'Sunday',    '8:00 AM - 10:00 AM', '2小時','3 號場', 6,  10, 380, '體能+技術複合訓練。',                          true, '2026-04-01', '2026-07-31'),

  -- Tai Po (3 classes)
  ('30000000-0008-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', '大埔兒童班',       'Coach Chan Ka Ming', '前港隊成員，十五年教學經驗',  '初級',     'Saturday',  '9:00 AM - 10:30 AM', '1.5小時','1 號場', 8,  12, 200, '公園兒童班。',                                 true, '2026-04-01', '2026-08-31'),
  ('30000000-0008-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '大埔成人混合',     'Coach Cheng Pui Yi', 'ITF 認證教練，專注成人訓練',  '中級', 'Wednesday', '7:30 PM - 9:00 PM', '1.5小時', '2 號場', 5,  10, 260, '成人中級混合班。',                             true, '2026-04-01', '2026-08-31'),
  ('30000000-0008-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', '週日清晨班',       'Coach Chan Ka Ming', '前港隊成員，十五年教學經驗',  '初級',     'Sunday',    '7:00 AM - 8:30 AM', '1.5小時', '1 號場', 6,  10, 220, '早晨打波，打完食早餐。',                       true, '2026-04-01', '2026-08-31')
ON CONFLICT (id) DO UPDATE SET
  club_id         = EXCLUDED.club_id,
  name            = EXCLUDED.name,
  coach           = EXCLUDED.coach,
  coach_bio       = EXCLUDED.coach_bio,
  level           = EXCLUDED.level,
  day             = EXCLUDED.day,
  time            = EXCLUDED.time,
  duration        = EXCLUDED.duration,
  location        = EXCLUDED.location,
  spots_available = EXCLUDED.spots_available,
  spots_total     = EXCLUDED.spots_total,
  price           = EXCLUDED.price,
  description     = EXCLUDED.description,
  visible         = EXCLUDED.visible,
  start_date      = EXCLUDED.start_date,
  end_date        = EXCLUDED.end_date;


-- -----------------------------------------------------------------------------
-- 5. Memberships — admin user across all clubs
-- -----------------------------------------------------------------------------
-- The admin user is lok.yeung.hk@gmail.com (c87080df-1e1f-4765-a9f5-af832156e87a).
-- We enrol them as owner of Sha Tin (their primary club), admin of four others,
-- coach of TKO Academy, and member of the rest — so the dashboard exercises
-- every cross-club role.
--
-- Additional demo members should be created via app signup. Once those users
-- exist, add them here with their UUIDs, or use the admin member-management UI.

INSERT INTO club_memberships (club_id, user_id, role, status, joined_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'owner',  'approved', NOW() - INTERVAL '90 days'),
  ('10000000-0000-0000-0000-000000000002', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'admin',  'approved', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000003', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'coach',  'approved', NOW() - INTERVAL '45 days'),
  ('10000000-0000-0000-0000-000000000004', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'member', 'approved', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000005', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'member', 'approved', NOW() - INTERVAL '20 days'),
  ('10000000-0000-0000-0000-000000000006', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'admin',  'approved', NOW() - INTERVAL '15 days'),
  ('10000000-0000-0000-0000-000000000007', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'member', 'approved', NOW() - INTERVAL '10 days'),
  ('10000000-0000-0000-0000-000000000008', 'c87080df-1e1f-4765-a9f5-af832156e87a', 'admin',  'approved', NOW() - INTERVAL '5 days')
ON CONFLICT (club_id, user_id, role) DO UPDATE SET
  status    = EXCLUDED.status,
  joined_at = EXCLUDED.joined_at;


-- -----------------------------------------------------------------------------
-- 6. Class bookings — admin user enrolled in classes across several clubs
-- -----------------------------------------------------------------------------
-- Demonstrates cross-club booking. Wrapped in a DO block so duplicates are
-- skipped cleanly (no composite unique constraint on class_bookings).

DO $$
DECLARE
  admin_user_id CONSTANT UUID := 'c87080df-1e1f-4765-a9f5-af832156e87a';
  v_class_id TEXT;
  v_club_id  UUID;
BEGIN
  FOR v_class_id, v_club_id IN
    SELECT id, club_id FROM (VALUES
      ('30000000-0001-0000-0000-000000000003'::UUID, '10000000-0000-0000-0000-000000000001'::UUID), -- Sha Tin 週六混合班
      ('30000000-0002-0000-0000-000000000002'::UUID, '10000000-0000-0000-0000-000000000002'::UUID), -- VP 中級班
      ('30000000-0003-0000-0000-000000000003'::UUID, '10000000-0000-0000-0000-000000000003'::UUID), -- TKO 學院成人高級
      ('30000000-0005-0000-0000-000000000003'::UUID, '10000000-0000-0000-0000-000000000005'::UUID)  -- DWB 週末進階
    ) AS t(id, club_id)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM class_bookings
      WHERE class_id = v_class_id AND user_id = admin_user_id AND status = 'confirmed'
    ) THEN
      INSERT INTO class_bookings (club_id, user_id, class_id, status)
      VALUES (v_club_id, admin_user_id, v_class_id, 'confirmed');
    END IF;
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 7. Court slot bookings — a few confirmed bookings in the next 7 days
-- -----------------------------------------------------------------------------
-- Creates 'booked' slots + matching bookings for the admin user so the booking
-- grids show some activity. Uses HKT date arithmetic.

DO $$
DECLARE
  admin_user_id CONSTANT UUID := 'c87080df-1e1f-4765-a9f5-af832156e87a';
  v_club_id  UUID;
  v_court_id TEXT;
  v_date     DATE;
  v_hour     INT;
  v_slot_id  UUID;
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('10000000-0000-0000-0000-000000000001'::UUID, '20000000-0001-0001-0000-000000000001'::UUID, 1, 19),
      ('10000000-0000-0000-0000-000000000001'::UUID, '20000000-0001-0001-0000-000000000001'::UUID, 1, 20),
      ('10000000-0000-0000-0000-000000000001'::UUID, '20000000-0001-0001-0000-000000000003'::UUID, 3, 20),
      ('10000000-0000-0000-0000-000000000002'::UUID, '20000000-0002-0002-0000-000000000001'::UUID, 2, 18),
      ('10000000-0000-0000-0000-000000000002'::UUID, '20000000-0002-0002-0000-000000000002'::UUID, 4, 19),
      ('10000000-0000-0000-0000-000000000004'::UUID, '20000000-0004-0004-0000-000000000001'::UUID, 5, 8),
      ('10000000-0000-0000-0000-000000000005'::UUID, '20000000-0005-0005-0000-000000000001'::UUID, 6, 16),
      ('10000000-0000-0000-0000-000000000007'::UUID, '20000000-0007-0007-0000-000000000001'::UUID, 2, 20)
    ) AS t(club_id, court_id, day_offset, hour)
  LOOP
    v_club_id  := r.club_id;
    v_court_id := r.court_id::text;
    v_date     := (NOW() AT TIME ZONE 'Asia/Hong_Kong')::DATE + (r.day_offset || ' days')::INTERVAL;
    v_hour     := r.hour;

    -- Skip if this court already has a slot booked for this date/hour.
    IF NOT EXISTS (
      SELECT 1 FROM slots
      WHERE club_id = v_club_id AND court_id = v_court_id AND date = v_date AND hour = v_hour
    ) THEN
      INSERT INTO slots (club_id, court_id, date, hour, status, booked_by)
      VALUES (v_club_id, v_court_id, v_date, v_hour, 'booked', admin_user_id)
      RETURNING id INTO v_slot_id;

      INSERT INTO bookings (club_id, user_id, slot_id, court_id, date, hour, status)
      VALUES (v_club_id, admin_user_id, v_slot_id, v_court_id, v_date, v_hour, 'confirmed');
    END IF;
  END LOOP;
END $$;


COMMIT;

-- =============================================================================
-- Done. Verify with:
--   SELECT slug, name, settings->>'lat' AS lat, settings->>'lng' AS lng FROM clubs ORDER BY slug;
--   SELECT c.name, c.surface, cl.name AS club FROM courts c JOIN clubs cl ON cl.id=c.club_id ORDER BY cl.name;
--   SELECT cl.name AS club, cs.name, cs.coach, cs.day, cs.time, cs.visibility FROM classes cs JOIN clubs cl ON cl.id=cs.club_id ORDER BY cl.name;
-- =============================================================================
