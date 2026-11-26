// A tiny progress track for the "My orders" list (Phase 4, step 3).
//
// The full checklist lives on the order page. In the list we only need
// "how far along is this?" — six segments, filled as the order advances,
// plus the current step in words. Cancelled gets no track at all.
import {
  PROGRESS_STEPS,
  STATUS_LABELS,
  progressIndex,
  type OrderStatus,
} from "@/lib/order-status";

export function ProgressTrack({ status }: { status: OrderStatus }) {
  const current = progressIndex(status);

  if (status === "cancelled") {
    return (
      <p className="mt-2 text-xs font-bold text-red-700">
        Cancelled — nothing was bought
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-1" aria-hidden="true">
        {PROGRESS_STEPS.map((step, index) => (
          <span
            key={step}
            className={
              "h-1.5 flex-1 rounded-full " +
              (index <= current ? "bg-emerald-600" : "bg-stone-200")
            }
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-bold text-emerald-800">
        {STATUS_LABELS[status]}
      </p>
    </div>
  );
}