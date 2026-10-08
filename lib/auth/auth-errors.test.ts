import { plainAuthError } from "./auth-errors.ts";

const cases: Array<[unknown, string, string]> = [
  [{ code: "invalid_credentials", message: "Invalid login credentials" },
   "not correct", "wrong code"],
  [{ code: "", message: "OTP has expired or is invalid" },
   "expired", "expired code"],
  [{ code: "", message: "For security purposes, you can only request this after 42 seconds." },
   "Wait about a minute", "too fast"],
  [{ code: "over_email_send_rate_limit", message: "Rate limit exceeded" },
   "Wait about a minute", "rate limit code"],
  [{ code: "", message: "SMS sending failed" },
   "could not send", "sms failure"],
  [{ code: "sms_send_failed",
     message: "Error sending confirmation OTP to provider: No Twilio trial phone number is assigned for messaging to this destination number. Please add the 'to' number as a verified recipient." },
   "Verified Caller ID", "twilio trial (real message from Supabase)"],
  [{ code: "", message: "Failed to fetch" },
   "internet connection", "network down"],
  [{ code: "unexpected_failure", message: "Database error querying schema" },
   "Something went wrong", "unknown falls back"],
];

let pass = 0, fail = 0;
for (const [err, expectIn, why] of cases) {
  const got = plainAuthError(err);
  if (got.toLowerCase().includes(expectIn.toLowerCase())) {
    pass++;
    console.log(`PASS  ${why}\n      "${got}"`);
  } else {
    fail++;
    console.log(`FAIL  ${why}\n      got "${got}"\n      wanted it to contain "${expectIn}"`);
  }
}
console.log(`\nnull input -> "${plainAuthError(null)}"`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
