// "My orders" — everything this customer has ever ordered (Phase 4, step 2).
//
// Newest first. The whole point of this page is that a customer can come
// back later, see the reference, and check where the order has got to.
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyOrders } from "@/lib/orders";
import { formatNaira } from "@/lib/money";
import { STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { ProgressTrack } from "./progress-track";
import { LiveOrders } from "./live-orders";

// Cancelled needs to look finished-and-closed, not "in progress".
function statusClasses(status: OrderStatus): string {
  if (status === "cancelled") return "bg-red-50 text-red-800";
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  return "bg-amber-50 text-amber-800";
}

// A short readable date, e.g. "12 Mar, 7:40 pm".
function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function MyOrdersPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orders = await listMyOrders();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
        My orders
      </h1>
      <LiveOrders channel="my-orders" />
      <p className="mt-2 text-sm leading-6 text-stone-500">
        Everything you have ordered from Foodrun.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-stone-800">No orders yet</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            When you place an order it will appear here with its reference.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => {
            const paid = order.status !== "received";
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold text-stone-900">
                        {order.restaurant_name}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-stone-400">
                        {order.reference} · {shortDate(order.created_at)}
                      </p>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold " +
                        statusClasses(order.status)
                      }
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-sm font-extrabold text-stone-900">
                      {formatNaira(order.total)}
                    </p>
                    {!paid && (
                      <p className="text-xs font-bold text-amber-700">
                        Transfer needed
                      </p>
                    )}
                  </div>

                  <ProgressTrack status={order.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}