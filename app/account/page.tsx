// The first protected page in the app.
//
// It reads the session on the server, and sends anyone without one to
// /login. Because this runs on the server, the check cannot be skipped
// by disabling JavaScript in the browser.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Your account — Foodrun",
};

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  admin: "Admin (you)",
  agent: "Delivery agent",
};

export default async function AccountPage() {
  const supabase = await createClient();

  // getUser() checks the token with Supabase itself rather than trusting
  // the cookie alone. null means not signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const phone = profile?.phone ?? "not on file";
  const label = phone.startsWith("+234")
    ? "0" + phone.slice(4)
    : phone;
 const isAgent = profile?.role === "agent";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
        Foodrun
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
        Your account
      </h1>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Phone number
            </dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {label}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Name
            </dt>
            <dd className="mt-1 text-lg font-semibold text-stone-900">
              {profile?.full_name?.trim() || "Not set yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Role
            </dt>
            <dd className="mt-1">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                {ROLE_LABEL[profile?.role ?? "customer"] ?? profile?.role}
              </span>
            </dd>
          </div>
        </dl>
      </div>

 {isAgent && (
 <Link
 href="/agent"
 className="mb-3 block rounded-xl bg-emerald-700 px-4 py-3.5 text-center text-base font-bold text-white transition hover:bg-emerald-800"
 >
 My deliveries
 </Link>
 )}

      <form action={signOut} className="mt-5">
        <button
          type="submit"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-base font-bold text-stone-700 transition hover:bg-stone-50"
        >
          Sign out
        </button>
      </form>

      <Link
        href="/"
        className="mt-4 block text-center text-sm font-semibold text-emerald-700 underline underline-offset-2"
      >
        Back to home
      </Link>
    </main>
  );
}