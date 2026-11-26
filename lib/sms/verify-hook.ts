// Proving that a hook request really came from Supabase.
//
// Our /api/auth/send-sms endpoint sends real SMS, which costs real money.
// If we accepted any request, a stranger could POST to it in a loop and
// drain the Termii balance. So Supabase signs every hook call, and we
// check the signature before sending anything.
//
// The signing scheme is the open "Standard Webhooks" one:
//
//   signed content = "<id>.<timestamp>.<body>"
//   signature      = base64( HMAC-SHA256(secret, signed content) )
//
// The secret Supabase shows looks like "v1,whsec_<base64>". We decode
// the part after "whsec_" and use those bytes as the HMAC key.
import { createHmac, timingSafeEqual } from "node:crypto";

// Refuse requests older than this, so a captured request cannot be
// replayed tomorrow. Five minutes is generous enough for clock drift.
const MAX_AGE_SECONDS = 5 * 60;

export function verifyHookSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  rawBody: string;
  now?: number;
}): boolean {
  const { secret, id, timestamp, signatureHeader, rawBody } = input;
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const now = input.now ?? Date.now() / 1000;
  if (Math.abs(now - sentAt) > MAX_AGE_SECONDS) return false;

  // Strip the "v1,whsec_" prefix Supabase puts in front of the key.
  const keyBase64 = secret.startsWith("v1,whsec_")
    ? secret.slice("v1,whsec_".length)
    : secret.replace(/^whsec_/, "");

  const key = Buffer.from(keyBase64, "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  // The header can carry more than one signature, space separated, e.g.
  // "v1,abc123 v1,def456". Any one of them matching is enough.
  return signatureHeader
    .split(" ")
    .map((part) => part.replace(/^v1,/, ""))
    .some((signature) => {
      const given = Buffer.from(signature, "base64");
      return (
        given.length === expected.length && timingSafeEqual(given, expected)
      );
    });
}
