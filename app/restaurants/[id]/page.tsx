// Restaurant menu page (Phase 2, step 2).
//
// Open to guests — no login needed. Shows the restaurant header plus its
// items with price and an unavailable marker. Add-to-cart comes in Phase 3.
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantWithMenu } from "@/lib/restaurants";
import { formatNaira } from "@/lib/money";
import { addToCart } from "./actions";

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  await connection();
  const { id } = await params;
  const restaurant = await getRestaurantWithMenu(id);
  if (!restaurant) notFound();
  const { added } = await searchParams;
  const addedItem = added
    ? restaurant.items.find((item) => item.id === added)
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-stone-500 underline underline-offset-2"
        >
          ← All restaurants
        </Link>
        <Link
          href="/cart"
          className="text-sm font-bold text-emerald-700 underline underline-offset-2"
        >
          View cart
        </Link>
      </div>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
        {restaurant.name}
      </h1>
      {restaurant.description && (
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {restaurant.description}
        </p>
      )}
      {restaurant.address && (
        <p className="mt-1 text-xs leading-5 text-stone-400">
          {restaurant.address}
          {restaurant.opening_hours ? ` · ${restaurant.opening_hours}` : ""}
        </p>
      )}

      {addedItem && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-emerald-800">
            Added {addedItem.name} to your cart.
          </p>
          <Link
            href="/cart"
            className="mt-1 block text-sm font-bold text-emerald-700 underline underline-offset-2"
          >
            View cart
          </Link>
        </div>
      )}

      {restaurant.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-stone-800">No menu yet.</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Add items in Supabase → Table editor → menu_items for this
            restaurant, then reload.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {restaurant.items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-extrabold tracking-tight text-stone-900">
                  {item.name}
                </p>
                <p className="shrink-0 text-base font-extrabold text-stone-900">
                  {formatNaira(item.price)}
                </p>
              </div>
              {item.description && (
                <p className="mt-1 text-sm leading-6 text-stone-500">
                  {item.description}
                </p>
              )}
              {!item.is_available ? (
                <p className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500">
                  Currently unavailable
                </p>
              ) : (
                <form action={addToCart} className="mt-3">
                  <input
                    type="hidden"
                    name="restaurant_id"
                    value={restaurant.id}
                  />
                  <input type="hidden" name="menu_item_id" value={item.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
                  >
                    Add to cart
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
