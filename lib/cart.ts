// Reading and writing the customer's cart (Phase 3, step 2).
//
// One cart per customer, tied to one restaurant. Prices are copied from
// menu_items on the server when an item is added — the browser never
// decides what anything costs.
import { createClient } from "@/lib/supabase/server";

export type CartLine = {
  id: string;
  item_name: string;
  unit_price: number; // whole naira
  quantity: number;
};

export type Cart = {
  restaurant_id: string | null;
  lines: CartLine[];
};

/** The signed-in customer's cart, or an empty one if none exists yet. */
export async function getCart(): Promise<Cart> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { restaurant_id: null, lines: [] };

  const { data: cart } = await supabase
    .from("carts")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!cart) return { restaurant_id: null, lines: [] };

  const { data: lines } = await supabase
    .from("cart_items")
    .select("id, item_name, unit_price, quantity")
    .eq("cart_id", user.id)
    .order("created_at");

  return { restaurant_id: cart.restaurant_id, lines: lines ?? [] };
}
