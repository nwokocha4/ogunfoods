// Order confirmation page (Phase 4, step 1).
//
// The customer lands here straight after placing an order. They see the
// reference, the total, the exact bank transfer instructions, and the
// progress bar. Nothing is bought until the owner confirms the payment.
import { connection } from "next/server";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrder, getBankDetails } from "@/lib/orders";
import { formatNaira } from "@/lib/money";
import { canCustomerCancel } from "@/lib/order-status";
import { OrderProgress } from "../progress-bar";
import { cancelOrder } from "../actions";
import { LiveOrders } from "../live-orders";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [order, bank] = await Promise.all([getOrder(id), getBankDetails()]);
  if (!order) notFound();

  const awaitingPayment = order.status === "received";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <LiveOrders channel={`order-${order.id}`} orderId={order.id} />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
        {awaitingPayment ? "Order received" : "Your order"}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
        {order.reference}
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        {order.restaurant_name}
      </p>

      {awaitingPayment && (
        <>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Thank you, {order.customer_name}. Transfer{" "}
            <span className="font-extrabold text-stone-900">
              {formatNaira(order.total)}
            </span>{" "}
            to the account below, and put{" "}
            <span className="font-extrabold text-stone-900">
              {order.reference}
            </span>{" "}
            in the transfer narration.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pay this amount
            </p>
            <p className="mt-1 text-3xl font-extrabold text-stone-900">
              {formatNaira(order.total)}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-stone-600">Bank</dt>
                <dd className="font-bold text-stone-900">
                  {bank.bank_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-stone-600">Account number</dt>
                <dd className="font-bold text-stone-900">
                  {bank.account_number ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-stone-600">Account name</dt>
                <dd className="font-bold text-stone-900">
                  {bank.account_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-stone-600">Narration</dt>
                <dd className="font-bold text-stone-900">
                  {order.reference}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-amber-800">
              Your order will not be prepared until your payment is confirmed.
            </p>
          </div>
        </>
      )}

      <div className="mt-5">
        <OrderProgress status={order.status} />
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-stone-800">What you ordered</p>
        <ul className="mt-2 space-y-1">
          {order.lines.map((line) => (
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
          <div className="flex justify-between text-stone-600">
            <span>Food subtotal</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(order.food_subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Delivery fee</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(order.delivery_fee)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Service fee</span>
            <span className="font-semibold text-stone-900">
              {formatNaira(order.service_fee)}
            </span>
          </div>
          <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-extrabold text-stone-900">
            <span>Total</span>
            <span>{formatNaira(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-stone-800">Delivering to</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          {order.customer_name}
          <br />
          {order.delivery_address}
          {order.area_name ? `, ${order.area_name}` : ""}
          <br />
          {order.customer_phone}
        </p>
        {order.notes && (
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Note: {order.notes}
          </p>
        )}
      </div>

      {canCustomerCancel(order.status) && (
        <form action={cancelOrder} className="mt-4">
          <input type="hidden" name="order_id" value={order.id} />
          <button
            type="submit"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            Cancel this order
          </button>
          <p className="mt-2 text-center text-xs leading-5 text-stone-400">
            You can cancel until your payment is confirmed.
          </p>
        </form>
      )}

      <Link
        href="/orders"
        className="mt-4 block rounded-xl bg-emerald-700 px-4 py-3.5 text-center text-base font-bold text-white transition hover:bg-emerald-800"
      >
        My orders
      </Link>
    </main>
  );
}