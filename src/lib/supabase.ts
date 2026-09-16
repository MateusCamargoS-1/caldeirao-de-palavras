import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://agsoguzmbpkhenyfxyvz.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_75tgYh7WkFC92YamN7PQbg_xtWAOK_9";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
