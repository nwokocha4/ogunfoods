// Placing the order (Phase 3, step 6).
//
// Server Action: the browser's form only carries the delivery details
// the customer typed. All money is worked out inside the place_order()
// database function (see supabase/migrations/0004_place_order.sql),
// which the customer cannot bypass — there is no RLS rule letting a
// customer insert orders directly.
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeNigerianPhone } from "@/lib/phone";

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeNigerianPhone(String(formData.get("phone") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  const areaId = String(formData.get("area") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name || !phone || !address || !areaId) redirect("/checkout");

  const { data, error } = await supabase.rpc("place_order", {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_area_id: areaId,
    p_notes: notes || null,
  });

  // Anything wrong (empty cart, below minimum, unknown area) sends the
  // customer back to fix it. The function raises before writing, so a
  // failed placement never leaves a half-made order behind.
  if (error || !data) redirect("/checkout");

  redirect(`/orders/${data}`);
}
