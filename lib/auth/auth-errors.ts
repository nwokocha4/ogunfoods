// Turning Supabase's error text into something a customer can act on.
//
// Supabase speaks in codes and developer English ("Invalid login
// credentials"). A hungry customer at 8pm does not want that. Every
// error the login screens show comes from here, in plain words, with
// what to do next.

export function plainAuthError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  const err = error as { code?: string; message?: string };
  const code = (err.code ?? "").toLowerCase();
  const message = (err.message ?? "").toLowerCase();
  const both = `${code} ${message}`;

  // Wrong code typed in.
  if (
    both.includes("invalid_credentials") ||
    both.includes("otp") && both.includes("not match") ||
    both.includes("token is not valid") ||
    both.includes("invalid") && both.includes("code")
  ) {
    return "That code is not correct. Check the 6 digits and try again.";
  }

  // Code ran out of time.
  if (both.includes("expired")) {
    return "That code has expired. Ask for a new one and enter it quickly.";
  }

  // Asked for too many codes too fast. This is what protects you from
  // paying for SMS on a repeated tap. Supabase phrases its cooldown as
  // "you can only request this after 42 seconds", which is the single
  // most common message people hit on the resend button.
  if (
    both.includes("rate limit") ||
    both.includes("rate_limit") ||
    both.includes("too many") ||
    (both.includes("over_") && both.includes("rate")) ||
    both.includes("can only request this after") ||
    both.includes("security purposes")
  ) {
    return "Too many attempts. Wait about a minute, then try again.";
  }

  // Phone number we cannot send to, or SMS not switched on.
  if (
    both.includes("phone") && both.includes("not") ||
    both.includes("sms") && (both.includes("failed") || both.includes("not")) ||
    both.includes("message_not_authorized") ||
    both.includes("channel")
  ) {
    return "We could not send the code to that number. Check the number, and make sure phone login is enabled in Supabase.";
  }

  // No network, Supabase unreachable, DNS down, laptop asleep.
  if (
    both.includes("failed to fetch") ||
    both.includes("network") ||
    both.includes("fetch failed") ||
    both.includes("econnrefused") ||
    both.includes("timeout")
  ) {
    return "Could not reach the server. Check your internet connection and try again.";
  }

  // Nothing matched — still say something useful rather than nothing.
  return "Something went wrong. Please try again.";
}