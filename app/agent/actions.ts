// Status changes made by a delivery agent (Phase 4, step 7).
//
// The browser only shows the button for the next valid step, but that is
// not enough on its own: a visitor could call this action by hand. So the
// server checks the role, the assignment and the current status again, and
// the database trigger enforces the same rule as a final safety net.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nextAgentStatus, type OrderStatus } from "@/lib/order-status";

export async function advanceOrderStatus(formData: FormData) {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) redirect("/login");

 const orderId = String(formData.get("order_id") ?? "");
 if (!orderId) redirect("/agent?error=missing");

 // A customer who knows an order id must not be able to move it.
 const { data: profile } = await supabase
 .from("profiles")
 .select("role")
 .eq("id", user.id)
 .maybeSingle();
 if (profile?.role !== "agent") redirect("/account");

 const { data: order } = await supabase
 .from("orders")
 .select("status")
 .eq("id", orderId)
 .eq("agent_id", user.id)
 .maybeSingle();
 if (!order) redirect("/agent?error=missing");

 const current = order.status as OrderStatus;
 const next = nextAgentStatus(current);
 if (!next) redirect("/agent?error=status");

 // The status in the WHERE clause stops two taps from skipping a step:
 // after the first update the row no longer has the status we read.
 const { data: updated, error } = await supabase
 .from("orders")
 .update({ status: next })
 .eq("id", orderId)
 .eq("agent_id", user.id)
 .eq("status", current)
 .select("id");

 if (error) {
 console.error("Could not advance order status:", error.message);
 redirect("/agent?error=update");
 }
 if (!updated?.length) redirect("/agent?error=stale");

 revalidatePath("/agent");
 revalidatePath("/orders");
 revalidatePath(`/orders/${orderId}`);
 redirect("/agent");
}
