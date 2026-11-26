// The one list of order statuses (see CLAUDE.md).
//
// These match the database enum in supabase/migrations/0001_schema.sql.
// Never type a status string inline — import from here, so a typo cannot
// invent a status the database will reject anyway.

export const ORDER_STATUSES = [
  "received",
  "confirmed",
  "agent_buying",
  "picked_up",
  "on_the_way",
  "delivered",
] as const;

/** Cancelled is the terminal dead end, not a step on the progress bar. */
export const CANCELLED_STATUS = "cancelled" as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number] | typeof CANCELLED_STATUS;

/** The statuses that appear on the progress bar. Cancelled is a dead end. */
export const PROGRESS_STEPS = ORDER_STATUSES;

/** Plain words for the customer. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  confirmed: "Confirmed",
  agent_buying: "Agent buying",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * How far along the bar an order is.
 * Returns -1 for cancelled, because it is not a step on the bar.
 */
export function progressIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  return PROGRESS_STEPS.indexOf(status);
}

/** The next status an agent may move to, or null if finished. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = progressIndex(status);
  if (index < 0 || index >= PROGRESS_STEPS.length - 1) return null;
  return PROGRESS_STEPS[index + 1];
}

/**
 * The one step an agent is allowed to make.
 * Confirmed is deliberately the first step: only the owner confirms payment.
 * Received, delivered and cancelled have no agent step.
 */
export function nextAgentStatus(status: OrderStatus): OrderStatus | null {
 switch (status) {
 case "confirmed":
 return "agent_buying";
 case "agent_buying":
 return "picked_up";
 case "picked_up":
 return "on_the_way";
 case "on_the_way":
 return "delivered";
 default:
 return null;
 }
}

/** Customers may cancel only before payment is confirmed. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === "received";
}