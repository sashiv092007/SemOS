"use client";

import { createClient } from "@supabase/supabase-js";

// The project URL and publishable key are public by design (row-level security protects the data).
// Env vars override them, e.g. for a separate test project.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dgxqcgavbcicstmgitdz.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_WOJfBRS-ex-n4q8ogmKHhQ_RJ_U-TTU";

export const SUPABASE_URL = URL;
export const SUPABASE_KEY = KEY;

/** Browser client. The session lives in this browser's storage and refreshes itself. */
export const supabase = createClient(URL, KEY, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
