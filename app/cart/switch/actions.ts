// Clearing the cart and adding the new dish (Phase 3, step 4).
//
// Runs only after the customer tapped "Clear cart and add it" on the
// confirmation page. Price is read from the database, same as addToCart.
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function clearCartAndAdd(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const restaurantId = String(formData.get("restaurant_id") ?? "");
  const menuItemId = String(formData.get("menu_item_id") ?? "");
  if (!restaurantId || !menuItemId) redirect("/");

  const { data: item } = await supabase
    .from("menu_items")
    .select("id, restaurant_id, name, price, is_available")
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .single();

  if (!item) redirect(`/restaurants/${restaurantId}`);

  // Empty the old cart, retie it to the new restaurant, add the dish.
  await supabase.from("cart_items").delete().eq("cart_id", user.id);
  await supabase
    .from("carts")
    .upsert({ id: user.id, restaurant_id: restaurantId });
  await supabase.from("cart_items").insert({
    cart_id: user.id,
    menu_item_id: item.id,
    item_name: item.name,
    unit_price: item.price,
    quantity: 1,
  });

  redirect("/cart");
}
