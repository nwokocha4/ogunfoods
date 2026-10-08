"use client";

// Step 1: ask for a phone number and send the code.
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { normalizeNigerianPhone } from "@/lib/phone";
import { plainAuthError } from "@/lib/auth/auth-errors";

export function PhoneStep({
  onCodeSent,
}: {
  onCodeSent: (e164: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 0803... and +234803... both mean the same number.
    const phone = normalizeNigerianPhone(value);
    if (!phone) {
      setError(
        "That does not look like a Nigerian mobile number. Try 0803 123 4567.",
      );
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);

    if (sendError) {
      setError(plainAuthError(sendError));
      return;
    }

    onCodeSent(phone);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <label
        htmlFor="phone"
        className="block text-sm font-bold text-stone-800"
      >
        Phone number
      </label>

      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        autoFocus
        placeholder="0803 123 4567"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
        className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-lg text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-50"
      />

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:bg-stone-300"
      >
        {busy ? "Sending your code…" : "Send me a code"}
      </button>
    </form>
  );
}