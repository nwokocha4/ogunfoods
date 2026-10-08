// Turning what a customer types into the format Supabase expects.
//
// Supabase stores phone numbers in international format: +2348031234567.
// People in Nigeria type the same number several different ways:
//
//   0803 123 4567      (with spaces)
//   08031234567        (local format, the most common)
//   +2348031234567     (international)
//   2348031234567      (international without the plus)
//   8031234567         (country code and leading zero dropped)
//
// They all mean one number. Normalising here means we never end up with
// two accounts for the same person.

/** Returns a number in +234XXXXXXXXXX form, or null if it isn't a
 *  valid Nigerian mobile number. */
export function normalizeNigerianPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;

  // Keep only digits and a leading plus, so "0803 123 4567" and
  // "0803-123-4567" both become the same thing.
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let digits = cleaned.replace(/^\+/, "");

  // 0803 123 4567 -> +2348031234567
  if (digits.startsWith("0")) {
    digits = "234" + digits.slice(1);
  }
  // +2348031234567 -> already correct
  else if (digits.startsWith("234")) {
    // leave it
  }
  // 8031234567 -> +2348031234567
  else if (digits.length === 10) {
    digits = "234" + digits;
  } else {
    return null;
  }

  // 234 then 10 more digits. The first digit after the country code must
  // be 7, 8 or 9 — that is what marks it as a Nigerian mobile number.
  // Example: 234 8 031234567 = 13 characters.
  if (!/^234[789]\d{9}$/.test(digits)) return null;

  return "+" + digits;
}

/** True if this looks like a Nigerian mobile number we can send a code to. */
export function isValidNigerianPhone(raw: string): boolean {
  return normalizeNigerianPhone(raw) !== null;
}