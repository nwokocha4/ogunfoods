// Home page placeholder (Phase 1, Step 1).
// It shows the app name and whether the Supabase connection works.
// Real customer pages (restaurants, menu, cart, checkout) come in later phases.
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Check the Supabase connection on every request, not at build time,
// so the status updates after you add .env.local without a rebuild.
// `connection()` is how we ask for a live render under Next.js 16.
export default async function Home() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Default state: the owner hasn't created .env.local yet
  // (see docs/SETUP-CHECKLIST.md step 4).
  let status: "missing" | "connected" | "invalid" = "missing";
  let detail =
    "Create a file named .env.local with your Supabase URL and anon key, then restart the dev server.";

  if (url && anonKey) {
    // Ask Supabase for the current session. This needs no database tables,
    // so it works before the Step 2 migrations — it only proves the URL
    // and key reach a real Supabase project.
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      status = "invalid";
      detail =
        "Supabase answered, but the keys look wrong. Check .env.local for typos or stray spaces.";
    } else {
      status = "connected";
      detail = "The app can reach your Supabase project.";
    }
  }

  const pill =
    status === "connected"
      ? "bg-green-100 text-green-800"
      : status === "invalid"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  const label =
    status === "connected"
      ? "Supabase: connected"
      : status === "invalid"
        ? "Supabase: key error"
        : "Supabase: not configured";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-[#FFFCF7] px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
        Lagos · Nigeria
      </p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-stone-900">
        Foodrun
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        Food delivery, handled by hand. Phase 1 foundation build.
      </p>

      <div className="mt-6 w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${pill}`}
        >
          {label}
        </span>
        <p className="mt-3 text-sm leading-6 text-stone-600">{detail}</p>
      </div>
    </main>
  );
}
