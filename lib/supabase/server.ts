// Server client: use this in Server Components, Server Actions and
// Route Handlers. It reads the login session from cookies so the
// server knows who is signed in on each request.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Pass every cookie Supabase asks for, so it can find the session.
        getAll() {
          return cookieStore.getAll();
        },
        // Save any updated cookies (e.g. a refreshed session) back to the browser.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Middleware (Step 5) will handle refreshing the session instead.
          }
        },
      },
    },
  );
}
