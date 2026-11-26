// Adding an item to the cart (Phase 3, step 2).
//
// A Server Action: runs on the server, so the price comes from the
// database, not from the browser. The browser only says WHICH dish.
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addToCart(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests cannot hold a cart. Checkout asks for login anyway, so send
  // them there now rather than after they picked food.
  if (!user) redirect("/login");

  const restaurantId = String(formData.get("restaurant_id") ?? "");
  const menuItemId = String(formData.get("menu_item_id") ?? "");
  if (!restaurantId || !menuItemId) return;

  // The price and availability are read here, on the server. A forged
  // request with a fake price changes nothing.
  const { data: item } = await supabase
    .from("menu_items")
    .select("id, restaurant_id, name, price, is_available")
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .single();

  if (!item) return;

  // Make sure the customer has a cart row, tied to this restaurant.
  const { data: existing } = await supabase
    .from("carts")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("carts")
      .insert({ id: user.id, restaurant_id: restaurantId });
  } else if (!existing.restaurant_id) {
    await supabase
      .from("carts")
      .update({ restaurant_id: restaurantId })
      .eq("id", user.id);
  } else if (existing.restaurant_id !== restaurantId) {
    // One cart belongs to one restaurant. Ask before clearing: the
    // confirmation page shows both names and the dish.
    const { count } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", user.id);
    if ((count ?? 0) > 0) {
      redirect(
        `/cart/switch?from=${existing.restaurant_id}&to=${restaurantId}&item=${menuItemId}`,
      );
    }
    // Cart row exists but is empty — just retie it, no need to ask.
    await supabase
      .from("carts")
      .update({ restaurant_id: restaurantId })
      .eq("id", user.id);
  }

  // Same dish twice raises the quantity instead of adding a second line.
  const { data: line } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", user.id)
    .eq("menu_item_id", item.id)
    .maybeSingle();

  if (line) {
    await supabase
      .from("cart_items")
      .update({ quantity: line.quantity + 1 })
      .eq("id", line.id);
  } else {
    await supabase.from("cart_items").insert({
      cart_id: user.id,
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: item.price,
      quantity: 1,
    });
  }

  // Back to the menu with a confirmation banner naming the dish.
  redirect(`/restaurants/${restaurantId}?added=${item.id}`);
}
