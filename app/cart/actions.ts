// Changing quantities and removing lines (Phase 3, step 3).
//
// Server Actions: they run on the server, and every write is scoped to
// the signed-in customer's own cart_id, so nobody can edit another
// person's cart even with a forged request.
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ownCartId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Set a line's quantity. Zero or less removes the line. */
export async function setQuantity(formData: FormData) {
  const supabase = await createClient();
  const cartId = await ownCartId(supabase);
  if (!cartId) return;

  const lineId = String(formData.get("line_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!lineId || !Number.isFinite(quantity)) return;

  if (quantity <= 0) {
    await supabase
      .from("cart_items")
      .delete()
      .eq("id", lineId)
      .eq("cart_id", cartId);
  } else {
    await supabase
      .from("cart_items")
      .update({ quantity: Math.floor(quantity) })
      .eq("id", lineId)
      .eq("cart_id", cartId);
  }
  revalidatePath("/cart");
}

/** Remove a line outright. */
export async function removeLine(formData: FormData) {
  const supabase = await createClient();
  const cartId = await ownCartId(supabase);
  if (!cartId) return;

  const lineId = String(formData.get("line_id") ?? "");
  if (!lineId) return;

  await supabase
    .from("cart_items")
    .delete()
    .eq("id", lineId)
    .eq("cart_id", cartId);
  revalidatePath("/cart");
}
