// Reading orders for the customer pages (Phase 4).
//
// Row-level security does the filtering: a customer can only read their
// own orders, so these queries do not need to add a customer check to be
// safe. They do add it anyway where it makes the intent obvious.
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/order-status";

export type OrderLine = {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  reference: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes: string | null;
  food_subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  payment_confirmed_at: string | null;
  expires_at: string;
  created_at: string;
  restaurant_name: string;
  area_name: string | null;
  lines: OrderLine[];
};

export type BankDetails = {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
};

/** The shop's bank details for the transfer instructions. */
export async function getBankDetails(): Promise<BankDetails> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("bank_name, account_number, account_name")
    .eq("id", 1)
    .maybeSingle();
  return (
    data ?? { bank_name: null, account_number: null, account_name: null }
  );
}

/** One order belonging to the signed-in customer, or null. */
export async function getOrder(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, reference, status, customer_name, customer_phone,
       delivery_address, notes, food_subtotal, delivery_fee, service_fee,
       total, payment_confirmed_at, expires_at, created_at,
       restaurants ( name ),
       delivery_areas ( name )`,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!order) return null;

  const { data: lines } = await supabase
    .from("order_items")
    .select("id, item_name, unit_price, quantity")
    .eq("order_id", id);

  // Supabase types a joined single row as an object or an array depending
  // on how it infers the relationship, so both shapes are handled.
  const restaurant = Array.isArray(order.restaurants)
    ? order.restaurants[0]
    : order.restaurants;
  const area = Array.isArray(order.delivery_areas)
    ? order.delivery_areas[0]
    : order.delivery_areas;

  return {
    ...order,
    status: order.status as OrderStatus,
    restaurant_name: restaurant?.name ?? "Restaurant",
    area_name: area?.name ?? null,
    lines: lines ?? [],
  };
}

/** Every order the signed-in customer has placed, newest first. */
export async function listMyOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("orders")
    .select(
      `id, reference, status, customer_name, customer_phone,
       delivery_address, notes, food_subtotal, delivery_fee, service_fee,
       total, payment_confirmed_at, expires_at, created_at,
       restaurants ( name ),
       delivery_areas ( name )`,
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((order) => {
    const restaurant = Array.isArray(order.restaurants)
      ? order.restaurants[0]
      : order.restaurants;
    const area = Array.isArray(order.delivery_areas)
      ? order.delivery_areas[0]
      : order.delivery_areas;
    return {
      ...order,
      status: order.status as OrderStatus,
      restaurant_name: restaurant?.name ?? "Restaurant",
      area_name: area?.name ?? null,
      lines: [],
    };
  });
}