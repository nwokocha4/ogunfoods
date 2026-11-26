// "Start a new cart?" confirmation (Phase 3, step 4).
//
// The customer added a dish from restaurant B while their cart holds
// food from restaurant A. One cart belongs to one restaurant, so they
// choose: clear A and add B's dish, or keep A and forget B's dish.
// Reached only via the addToCart redirect below — never linked directly.
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearCartAndAdd } from "./actions";

export default async function SwitchPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; item?: string }>;
}) {
  await connection();
  const { from, to, item } = await searchParams;
  if (!from || !to || !item) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: fromRestaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", from)
    .maybeSingle();
  const { data: toRestaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", to)
    .maybeSingle();
  const { data: menuItem } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("id", item)
    .eq("restaurant_id", to)
    .maybeSingle();

  // Stale or forged parameters — nothing to confirm.
  if (!fromRestaurant || !toRestaurant || !menuItem) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
        Start a new cart?
      </h1>
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm leading-6 text-stone-600">
          Your cart has food from{" "}
          <span className="font-bold text-stone-900">
            {fromRestaurant.name}
          </span>
          . One order comes from one restaurant, so adding{" "}
          <span className="font-bold text-stone-900">{menuItem.name}</span>{" "}
          from{" "}
          <span className="font-bold text-stone-900">{toRestaurant.name}</span>{" "}
          would clear your current cart.
        </p>
      </div>

      <form action={clearCartAndAdd} className="mt-5">
        <input type="hidden" name="restaurant_id" value={to} />
        <input type="hidden" name="menu_item_id" value={item} />
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-emerald-800"
        >
          Clear cart and add it
        </button>
      </form>
      <Link
        href={`/restaurants/${to}`}
        className="mt-3 block rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-center text-base font-bold text-stone-700 transition hover:bg-stone-50"
      >
        Keep my cart
      </Link>
    </main>
  );
}
