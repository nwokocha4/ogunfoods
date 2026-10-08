"use client";

// Step 2: enter the 6-digit code.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { plainAuthError } from "@/lib/auth/auth-errors";

// Must match Supabase's own cooldown: it refuses a second code to the
// same number for 60 seconds. If our button re-enabled any sooner, the
// customer would tap it and get a confusing error.
const RESEND_SECONDS = 60;

export function OtpStep({
  phone,
  onBack,
}: {
  phone: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  // A countdown so people cannot hammer the resend button (which would
  // cost money once real SMS is switched on).
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function verify(codeToCheck: string) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: codeToCheck,
      type: "sms",
    });
    setBusy(false);

    if (verifyError) {
      setError(plainAuthError(verifyError));
      setCode("");
      inputRef.current?.focus();
      return;
    }

    // Signed in. Go to the account page and refresh so the server sees
    // the new session cookie.
    router.push("/account");
    router.refresh();
  }

  async function resend() {
    if (secondsLeft > 0) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);

    if (sendError) {
      setError(plainAuthError(sendError));
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    setCode("");
    inputRef.current?.focus();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    // Submit the moment the sixth digit lands — one fewer tap.
    if (digits.length === 6) void verify(digits);
  }

  const pretty = phone.replace("+234", "0");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <label htmlFor="code" className="block text-sm font-bold text-stone-800">
        Enter the 6-digit code
      </label>
      <p className="mt-1 text-sm leading-5 text-stone-500">
        Sent to <span className="font-semibold text-stone-700">{pretty}</span>.
      </p>

      <input
        ref={inputRef}
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={handleChange}
        disabled={busy}
        className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-center text-3xl font-extrabold tracking-[0.5em] text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-50"
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
        type="button"
        onClick={() => void verify(code)}
        disabled={busy || code.length !== 6}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:bg-stone-300"
      >
        {busy ? "Checking…" : "Verify"}
      </button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="font-semibold text-stone-500 underline underline-offset-2"
        >
          Change number
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || secondsLeft > 0}
          className="font-semibold text-emerald-700 disabled:text-stone-400"
        >
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}