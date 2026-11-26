// Reading restaurants for the browsing pages (Phase 2).
//
// Guests can see these without logging in — the RLS policy lets anyone
// read restaurants where is_active is true. So this uses the plain
// server client, no session needed.
import { createClient } from "@/lib/supabase/server";

export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  opening_hours: string | null;
  image_url: string | null;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number; // whole naira
  image_url: string | null;
  is_available: boolean;
};

export type RestaurantWithMenu = Restaurant & { items: MenuItem[] };

/** One active restaurant plus its menu items, or null if not found. */
export async function getRestaurantWithMenu(
  id: string,
): Promise<RestaurantWithMenu | null> {
  const supabase = await createClient();
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, description, address, opening_hours, image_url")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (restaurantError || !restaurant) return null;

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name, description, price, image_url, is_available")
    .eq("restaurant_id", id)
    .order("name");

  if (itemsError) {
    console.error("Could not load menu items:", itemsError.message);
    return { ...restaurant, items: [] };
  }
  return { ...restaurant, items: items ?? [] };
}

/** Active restaurants, alphabetical. Returns [] if Supabase is unreachable. */
export async function listRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, description, address, opening_hours, image_url")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Could not load restaurants:", error.message);
    return [];
  }
  return data ?? [];
}
