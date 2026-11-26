// The delivery agent's work list (Phase 4, step 6).
//
// An agent sees only the orders assigned to them, with one button for the
// next valid status. Received orders wait for the owner to confirm payment;
// delivered and cancelled orders are finished.
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAgent, listAssignedOrders, type AgentOrder } from "@/lib/agent-orders";
import {
 nextAgentStatus,
 STATUS_LABELS,
 type OrderStatus,
} from "@/lib/order-status";
import { advanceOrderStatus } from "./actions";
import { formatNaira } from "@/lib/money";
import { ProgressTrack } from "@/app/orders/progress-track";
import { LiveOrders } from "@/app/orders/live-orders";

export const metadata: Metadata = {
 title: "My deliveries — Foodrun",
};

const ERROR_TEXT: Record<string, string> = {
 missing: "That order is no longer assigned to you.",
 status: "That order cannot be moved any further.",
 stale: "The order changed in another tab. Reload before trying again.",
 update: "The status could not be changed. Please try again.",
};

function statusClasses(status: OrderStatus): string {
 if (status === "cancelled") return "bg-red-50 text-red-800";
 if (status === "delivered") return "bg-emerald-50 text-emerald-800";
 return "bg-amber-50 text-amber-800";
}

function shortDate(iso: string): string {
 return new Date(iso).toLocaleString("en-GB", {
 day: "numeric",
 month: "short",
 hour: "numeric",
 minute: "2-digit",
 hour12: true,
 });
}

function OrderCard({ order }: { order: AgentOrder }) {
 return (
 <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
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

 <ProgressTrack status={order.status} />

 <div className="mt-4 space-y-1 text-sm leading-6 text-stone-600">
 <p className="font-bold text-stone-900">{order.customer_name}</p>
 <p>{order.delivery_address}</p>
 {order.area_name && <p>{order.area_name}</p>}
 <p>
 <a
 href={`tel:${order.customer_phone}`}
 className="font-semibold text-emerald-700 underline underline-offset-2"
 >
 {order.customer_phone}
 </a>
 </p>
 {order.notes && <p className="text-stone-500">Note: {order.notes}</p>}
 </div>

 {order.lines.length > 0 && (
 <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-600">
 {order.lines.map((line) => (
 <li key={line.id} className="flex justify-between gap-3">
 <span>
 {line.quantity} × {line.item_name}
 </span>
 <span className="shrink-0 font-semibold text-stone-900">
 {formatNaira(line.unit_price * line.quantity)}
 </span>
 </li>
 ))}
 </ul>
 )}

 <p className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-base font-extrabold text-stone-900">
 <span>Order total</span>
 <span>{formatNaira(order.total)}</span>
 </p>

 {(() => {
 const next = nextAgentStatus(order.status);
 if (!next) return null;
 return (
 <form action={advanceOrderStatus} className="mt-4">
 <input type="hidden" name="order_id" value={order.id} />
 <button
 type="submit"
 className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white transition hover:bg-emerald-800"
 >
 Mark as {STATUS_LABELS[next]}
 </button>
 </form>
 );
 })()}
 </li>
 );
}

export default async function AgentPage({
 searchParams,
}: {
 searchParams: Promise<{ error?: string }>;
}) {
 await connection();
 const { error } = await searchParams;
 if (!(await isAgent())) redirect("/account");

 const orders = await listAssignedOrders();

 return (
 <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FFFCF7] px-6 py-10">
 <LiveOrders channel="agent-orders" />
 <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
 Delivery agent
 </p>
 <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
 My deliveries
 </h1>
 <p className="mt-2 text-sm leading-6 text-stone-500">
 Only orders assigned to you are shown here.
 </p>

 {error && (
 <p
 role="alert"
 className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
 >
 {ERROR_TEXT[error] ?? "Something went wrong. Please try again."}
 </p>
 )}

 {orders.length === 0 ? (
 <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
 <p className="text-sm font-bold text-stone-800">No assignments yet</p>
 <p className="mt-1 text-sm leading-6 text-stone-500">
 When the owner assigns an order to you, it will appear here.
 </p>
 </div>
 ) : (
 <ul className="mt-6 space-y-3">
 {orders.map((order) => (
 <OrderCard key={order.id} order={order} />
 ))}
 </ul>
 )}

 <Link
 href="/account"
 className="mt-6 block text-center text-sm font-semibold text-emerald-700 underline underline-offset-2"
 >
 Back to account
 </Link>
 </main>
 );
}
