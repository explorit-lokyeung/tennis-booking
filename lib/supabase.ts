import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtinvnccabizaweqyszz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LOa6NHmKG0bs0qdezNMpGw_w2HGigQP';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
