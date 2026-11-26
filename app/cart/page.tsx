// Cart page (Phase 3, step 3).
//
// Signed-in customers only — guests are sent to /login, since checkout
// needs a login anyway. Shows each line with quantity controls and the
// food subtotal. Checkout itself comes in step 5.
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCart } from "@/lib/cart";
import { formatNaira } from "@/lib/money";
import { setQuantity, removeLine } from "./actions";

export default async function CartPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cart = await getCart();
  const subtotal = cart.lines.reduce(
    (sum, line) => sum + line.unit_price * line.quantity,
    0,
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <Link
        href="/"
        className="text-sm font-semibold text-stone-500 underline underline-offset-2"
      >
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
        Your cart
      </h1>

      {cart.lines.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-stone-800">
            Your cart is empty.
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Pick a restaurant and add something you like.
          </p>
          <Link
            href="/"
            className="mt-4 block rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-4">
            {cart.lines.map((line) => (
              <li
                key={line.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-extrabold tracking-tight text-stone-900">
                    {line.item_name}
                  </p>
                  <p className="shrink-0 text-base font-extrabold text-stone-900">
                    {formatNaira(line.unit_price * line.quantity)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {formatNaira(line.unit_price)} each
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <form action={setQuantity}>
                    <input type="hidden" name="line_id" value={line.id} />
                    <input
                      type="hidden"
                      name="quantity"
                      value={line.quantity - 1}
                    />
                    <button
                      type="submit"
                      aria-label={`One fewer ${line.item_name}`}
                      className="h-10 w-10 rounded-xl border border-stone-300 bg-white text-lg font-bold text-stone-700 transition hover:bg-stone-50"
                    >
                      −
                    </button>
                  </form>
                  <p className="min-w-8 text-center text-base font-extrabold text-stone-900">
                    {line.quantity}
                  </p>
                  <form action={setQuantity}>
                    <input type="hidden" name="line_id" value={line.id} />
                    <input
                      type="hidden"
                      name="quantity"
                      value={line.quantity + 1}
                    />
                    <button
                      type="submit"
                      aria-label={`One more ${line.item_name}`}
                      className="h-10 w-10 rounded-xl border border-stone-300 bg-white text-lg font-bold text-stone-700 transition hover:bg-stone-50"
                    >
                      +
                    </button>
                  </form>
                  <form action={removeLine} className="ml-auto">
                    <input type="hidden" name="line_id" value={line.id} />
                    <button
                      type="submit"
                      className="text-sm font-semibold text-stone-500 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-stone-800">Food subtotal</p>
              <p className="text-lg font-extrabold text-stone-900">
                {formatNaira(subtotal)}
              </p>
            </div>
            <p className="mt-1 text-xs leading-5 text-stone-400">
              Delivery fee and service fee are added at checkout.
            </p>
          </div>

          <Link
            href="/checkout"
            className="mt-4 block rounded-xl bg-emerald-700 px-4 py-3.5 text-center text-base font-bold text-white transition hover:bg-emerald-800"
          >
            Go to checkout
          </Link>
        </>
      )}
    </main>
  );
}
