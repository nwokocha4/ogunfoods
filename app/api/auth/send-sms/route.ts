// Supabase calls this URL when someone asks for a login code.
//
// Supabase has already worked out WHO is asking and generated the 6-digit
// code. Our only two jobs here are:
//   1. prove the request genuinely came from Supabase (the signature)
//   2. hand the code to Termii so it reaches the phone
import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms/termii";
import { verifyHookSignature } from "@/lib/sms/verify-hook";

// node:crypto is used for the signature check, so this must not run on
// the Edge runtime.
export const runtime = "nodejs";

// The shape Supabase posts to a Send SMS hook.
type SendSmsHookPayload = {
  user?: { id?: string; phone?: string };
  sms?: { otp?: string };
};

export async function POST(request: Request) {
  // Read the raw text, not request.json(). The signature is computed over
  // the exact bytes Supabase sent, so re-encoding the JSON could break it.
  const rawBody = await request.text();

  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    console.error("SEND_SMS_HOOK_SECRET is not set — refusing to send SMS.");
    return NextResponse.json(
      { error: "Server is not configured for SMS." },
      { status: 500 },
    );
  }

  const isFromSupabase = verifyHookSignature({
    secret,
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signatureHeader: request.headers.get("webhook-signature"),
    rawBody,
  });

  if (!isFromSupabase) {
    // Deliberately vague: a wrong secret and a forged request look the same.
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let payload: SendSmsHookPayload;
  try {
    payload = JSON.parse(rawBody) as SendSmsHookPayload;
  } catch {
    return NextResponse.json({ error: "Body was not JSON." }, { status: 400 });
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;

  if (!phone || !otp) {
    return NextResponse.json(
      { error: "Missing phone number or code." },
      { status: 400 },
    );
  }

  // Testing only, no Termii certificate needed. When SMS_TEST_MODE=true
  // in .env.local, the code is printed to the dev-server terminal instead
  // of sending a real SMS. Supabase still creates and checks the code.
  if (process.env.SMS_TEST_MODE === "true") {
    console.log(`[SMS-TEST] code for ${phone}: ${otp}`);
    return NextResponse.json({ ok: true });
  }

  try {
    await sendSms(phone, `Your Foodrun code is ${otp}. Do not share it.`);
  } catch (error) {
    // The customer only sees a generic "could not send" message, so the
    // real reason has to go to the server log where you can read it.
    console.error("Termii send failed:", error);
    return NextResponse.json(
      { error: "Could not send the code." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
