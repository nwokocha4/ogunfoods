// Numbers for the checkout page (Phase 3, step 5).
//
// Fees and minimum come from the settings table — never hardcoded.
// Service fee is a percentage of the FOOD SUBTOTAL ONLY, rounded to
// the nearest naira (₦7.50 → ₦8).
import { createClient } from "@/lib/supabase/server";

export type CheckoutData = {
  areas: { id: string; name: string }[];
  deliveryFee: number;
  serviceFeePercent: number;
  minimumOrder: number;
};

/** Fee settings plus the active delivery areas. Falls back to zeros. */
export async function getCheckoutData(): Promise<CheckoutData> {
  const supabase = await createClient();
  const [{ data: settings }, { data: areas }] = await Promise.all([
    supabase
      .from("settings")
      .select("delivery_fee, service_fee_percent, minimum_order")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("delivery_areas")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  return {
    areas: areas ?? [],
    deliveryFee: settings?.delivery_fee ?? 0,
    serviceFeePercent: Number(settings?.service_fee_percent ?? 0),
    minimumOrder: settings?.minimum_order ?? 500,
  };
}

/** Service fee for a food subtotal, rounded to the nearest naira. */
export function serviceFeeFor(subtotal: number, percent: number): number {
  return Math.round((subtotal * percent) / 100);
}
