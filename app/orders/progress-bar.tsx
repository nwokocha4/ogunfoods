// The progress bar on an order (Phase 4).
//
// Received → Confirmed → Agent buying → Picked up → On the way → Delivered
// Cancelled is NOT a step here — it shows as a dead-end banner instead,
// because it is not "further along" than anything.
import {
  PROGRESS_STEPS,
  STATUS_LABELS,
  progressIndex,
  type OrderStatus,
} from "@/lib/order-status";

export function OrderProgress({ status }: { status: OrderStatus }) {
  const current = progressIndex(status);

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="text-sm font-extrabold text-red-800">Cancelled</p>
        <p className="mt-1 text-sm leading-6 text-red-700">
          This order was cancelled. Nothing was purchased and no money left
          your account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
        Progress
      </p>
      <ol className="mt-3 space-y-0">
        {PROGRESS_STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const last = index === PROGRESS_STEPS.length - 1;
          return (
            <li key={step} className="flex gap-3">
              {/* The dot and the line between dots are one column, so the
                  bar reads as a single connected track on a narrow phone. */}
              <div className="flex flex-col items-center">
                <span
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold " +
                    (done
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-emerald-700 text-white ring-4 ring-emerald-100"
                        : "bg-stone-100 text-stone-400")
                  }
                >
                  {done ? "✓" : index + 1}
                </span>
                {!last && (
                  <span
                    className={
                      "w-0.5 flex-1 " +
                      (done ? "bg-emerald-600" : "bg-stone-200")
                    }
                  />
                )}
              </div>
              <div
                className={
                  "flex min-w-0 flex-1 items-start justify-between gap-2 " +
                  (last ? "pb-0" : "pb-3")
                }
              >
                <span
                  className={
                    "truncate text-sm " +
                    (active
                      ? "font-extrabold text-stone-900"
                      : done
                        ? "font-semibold text-stone-600"
                        : "font-medium text-stone-400")
                  }
                >
                  {STATUS_LABELS[step]}
                </span>
                {active && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Now
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}