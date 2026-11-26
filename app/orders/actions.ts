// Customer actions on an order (Phase 4).
//
// Right now: cancelling. The rule is strict — a customer may cancel ONLY
// while the order is still "received" (payment not verified). Once the
// owner confirms payment the order is locked, so a customer must never
// be able to flip it to cancelled after money has moved.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cancelOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect("/orders");

  // The .eq("status", "received") is the real guard: if the order has
  // moved on, the update matches nothing and no cancellation happens,
  // even if someone forged the request.
  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .eq("status", "received");

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  redirect(`/orders/${orderId}`);
}