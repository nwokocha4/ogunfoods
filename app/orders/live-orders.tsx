// Live order updates, shared by the customer list, order detail and agent list.
//
// Supabase Realtime only tells us that something changed. We deliberately ask
// Next.js to re-render the server component instead of patching the status in
// the browser: badges, progress, buttons and money all come from one source
// of truth.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LiveOrders({
  channel,
  orderId,
}: {
  channel: string;
  orderId?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // RLS decides which rows a signed-in visitor is allowed to see, so a
    // list needs no filter: they only receive changes to their own orders.
    const subscription = supabase
      .channel(channel)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
        ...(orderId ? { filter: `id=eq.${orderId}` } : {}),
      }, () => {
        router.refresh();
      })
      .subscribe();

    // Closing the channel matters on a phone: every visit would otherwise
    // leave a connection open and the app gets sluggish.
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [channel, orderId, router]);

  return null;
}
