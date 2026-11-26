// Checkout page (Phase 3, step 5).
//
// Signed-in only. Shows the cart lines, the delivery form (name, phone,
// address, area dropdown, notes), and the fee breakdown from settings:
// food subtotal + delivery fee + service fee = total. The ₦500 minimum
// is enforced here on the server before showing the Place button.
// Placing the order itself is step 6.
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCart } from "@/lib/cart";
import { getCheckoutData, serviceFeeFor } from "@/lib/checkout";
import { formatNaira } from "@/lib/money";
import { placeOrder } from "./actions";

export default async function CheckoutPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cart, checkout] = await Promise.all([getCart(), getCheckoutData()]);

  if (cart.lines.length === 0) redirect("/cart");

  const subtotal = cart.lines.reduce(
    (sum, line) => sum + line.unit_price * line.quantity,
    0,
  );
  const serviceFee = serviceFeeFor(subtotal, checkout.serviceFeePercent);
  const total = subtotal + checkout.deliveryFee + serviceFee;
  const meetsMinimum = subtotal >= checkout.minimumOrder;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <Link
        href="/cart"
        className="text-sm font-semibold text-stone-500 underline underline-offset-2"
      >
        ← Back to cart
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900">
        Checkout
      </h1>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-stone-800">Your order</p>
        <ul className="mt-2 space-y-1">
          {cart.lines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between text-sm text-stone-600"
            >
              <span>
                {line.quantity} × {line.item_name}
              </span>
              <span className="font-semibold text-stone-900">
                {formatNaira(line.unit_price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex items-center justify-between text-stone-600">
            <span>Food subtotal</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-600">
            <span>Delivery fee</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(checkout.deliveryFee)}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-600">
            <span>Service fee ({checkout.serviceFeePercent}%)</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(serviceFee)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-base font-extrabold text-stone-900">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>
      </div>

      {!meetsMinimum ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-bold text-amber-800">
            Minimum order is {formatNaira(checkout.minimumOrder)}.
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-700">
            Your food subtotal is {formatNaira(subtotal)}. Add a little more
            from the menu to check out.
          </p>
          <Link
            href="/"
            className="mt-4 block rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <form
          action={placeOrder}
          className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <label
            htmlFor="name"
            className="block text-sm font-bold text-stone-800"
          >
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            defaultValue={profile?.full_name ?? ""}
            placeholder="e.g. Adaeze Okafor"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <label
            htmlFor="phone"
            className="mt-4 block text-sm font-bold text-stone-800"
          >
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={profile?.phone ?? ""}
            placeholder="0803 123 4567"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <label
            htmlFor="address"
            className="mt-4 block text-sm font-bold text-stone-800"
          >
            Delivery address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            required
            placeholder="House number, street"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <label
            htmlFor="area"
            className="mt-4 block text-sm font-bold text-stone-800"
          >
            Delivery area
          </label>
          <select
            id="area"
            name="area"
            required
            defaultValue=""
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="" disabled>
              Choose an area
            </option>
            {checkout.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>

          <label
            htmlFor="notes"
            className="mt-4 block text-sm font-bold text-stone-800"
          >
            Notes <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="e.g. Call when you arrive"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-emerald-800"
          >
            Place order · {formatNaira(total)}
          </button>
        </form>
      )}
    </main>
  );
}
