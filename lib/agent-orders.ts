// Orders assigned to the signed-in delivery agent (Phase 4, step 6).
//
// RLS already lets an agent read only orders where agent_id is their user
// id. We filter by agent_id explicitly too, so the intent is visible here
// and the page stays correct even if a policy is ever loosened by mistake.
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/order-status";
import type { OrderLine } from "@/lib/orders";

// Supabase knows the columns we selected here, not the extra key we use
// for grouping in memory, so add it to the line type explicitly.
type OrderLineWithOrderId = OrderLine & { order_id: string };

export type AgentOrder = {
 id: string;
 reference: string;
 status: OrderStatus;
 customer_name: string;
 customer_phone: string;
 delivery_address: string;
 area_name: string | null;
 notes: string | null;
 total: number;
 restaurant_name: string;
 created_at: string;
 lines: OrderLine[];
};

/** True only for a profile with the agent role. */
export async function isAgent(): Promise<boolean> {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) return false;

 const { data: profile } = await supabase
 .from("profiles")
 .select("role")
 .eq("id", user.id)
 .maybeSingle();

 return profile?.role === "agent";
}

/** Every order assigned to this agent, newest first, with its food lines. */
export async function listAssignedOrders(): Promise<AgentOrder[]> {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) return [];

 const { data: orders } = await supabase
 .from("orders")
 .select(
 `id, reference, status, customer_name, customer_phone,
 delivery_address, notes, total, created_at,
 restaurants ( name ),
 delivery_areas ( name )`,
 )
 .eq("agent_id", user.id)
 .order("created_at", { ascending: false });

 if (!orders?.length) return [];

 const ids = orders.map((order) => order.id);
 const { data: lines } = await supabase
 .from("order_items")
 .select("id, order_id, item_name, unit_price, quantity")
 .in("order_id", ids);

 // Group the lines by order so each card can show what the agent is
 // collecting, without a separate database call per card.
 const linesByOrder = new Map<string, OrderLine[]>();
 for (const line of (lines ?? []) as OrderLineWithOrderId[]) {
 const bucket = linesByOrder.get(line.order_id) ?? [];
 bucket.push(line);
 linesByOrder.set(line.order_id, bucket);
 }

 return orders.map((order) => {
 const restaurant = Array.isArray(order.restaurants)
 ? order.restaurants[0]
 : order.restaurants;
 const area = Array.isArray(order.delivery_areas)
 ? order.delivery_areas[0]
 : order.delivery_areas;

 return {
 id: order.id,
 reference: order.reference,
 status: order.status as OrderStatus,
 customer_name: order.customer_name,
 customer_phone: order.customer_phone,
 delivery_address: order.delivery_address,
 area_name: area?.name ?? null,
 notes: order.notes,
 total: order.total,
 restaurant_name: restaurant?.name ?? "Restaurant",
 created_at: order.created_at,
 lines: linesByOrder.get(order.id) ?? [],
 };
 });
}
