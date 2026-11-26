// Home page: the restaurant list (Phase 2, step 1).
//
// Open to guests — no login needed. Tapping a restaurant opens its menu
// (next step). The sign-in link stays for checkout later.
import { connection } from "next/server";
import Link from "next/link";
import { listRestaurants } from "@/lib/restaurants";

export default async function Home() {
  await connection();
  const restaurants = await listRestaurants();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
        Lagos · Nigeria
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
        Foodrun
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        Food delivery, handled by hand. Pick a restaurant to see its menu.
      </p>

      {restaurants.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-stone-800">
            No restaurants yet.
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Add some in Supabase → Table editor → restaurants (set is_active
            to true), then reload this page.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {restaurants.map((r) => (
            <li key={r.id}>
              <Link
                href={`/restaurants/${r.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-600"
              >
                <p className="text-lg font-extrabold tracking-tight text-stone-900">
                  {r.name}
                </p>
                {r.description && (
                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    {r.description}
                  </p>
                )}
                {r.address && (
                  <p className="mt-2 text-xs leading-5 text-stone-400">
                    {r.address}
                    {r.opening_hours ? ` · ${r.opening_hours}` : ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/login"
        className="mt-6 block rounded-xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-bold text-stone-700 transition hover:bg-stone-50"
      >
        Sign in
      </Link>
    </main>
  );
}
