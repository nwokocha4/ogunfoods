// Browser client: use this in Client Components ("use client" files).
// It reads the public Supabase URL and anon key from the environment.
// These two values are safe to expose in the browser — real security
// comes from row-level security (Step 3), not from hiding these keys.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
