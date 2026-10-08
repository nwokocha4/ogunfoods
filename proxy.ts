// Runs before every page request.
//
// Its one job here is to keep the login session fresh. Supabase stores a
// short-lived access token in a cookie; without this refresh, a customer
// would appear signed out part way through browsing.
//
// NOTE: Next.js 16 renamed this file from middleware.ts to proxy.ts.
// The functionality is the same.
//
// Route protection itself lives in the pages (see app/account/page.tsx),
// because the Next.js docs advise against doing full authorisation here.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read the session cookies the browser sent with this request.
        getAll() {
          return request.cookies.getAll();
        },
        // If Supabase rotated the token, write the new cookies onto the
        // response so the browser keeps them.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() is the safe choice over getSession(): it asks the Supabase
  // servers whether the token is really valid, instead of trusting
  // whatever is sitting in the cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on every route except Next.js's own static files and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};