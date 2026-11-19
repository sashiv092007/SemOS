"use client";

import { createClient } from "@supabase/supabase-js";

// The project URL and publishable key are public by design (row-level security protects the data).
// Env vars override them, e.g. for a separate test project.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wksyirpvjgkeejotuvle.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__M_gaGAa6nRVsJ4Ro6Crxg_R1jLrN-l";

export const SUPABASE_URL = URL;
export const SUPABASE_KEY = KEY;

/** Browser client. The session lives in this browser's storage and refreshes itself. */
export const supabase = createClient(URL, KEY, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
