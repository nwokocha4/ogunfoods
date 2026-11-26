// Delivering one SMS through Termii.
//
// Supabase still creates and checks the 6-digit code. This file only
// carries the finished message to the phone, replacing Twilio.
//
// The API key is read from .env.local on the server. It must never be
// sent to the browser, so the variable does NOT start with NEXT_PUBLIC_.

export async function sendSms(to: string, text: string): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID;
  const baseUrl = (
    process.env.TERMII_BASE_URL ?? "https://v4.api.termii.com"
  ).replace(/\/+$/, "");

  if (!apiKey) throw new Error("TERMII_API_KEY is missing from .env.local");
  if (!senderId) throw new Error("TERMII_SENDER_ID is missing from .env.local");

  const response = await fetch(`${baseUrl}/api/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      // Termii wants the number without the leading "+":
      // +2348031234567 becomes 2348031234567.
      to: to.replace(/^\+/, ""),
      from: senderId,
      sms: text,
      type: "plain",
      // "generic" routes through the normal promotional/transactional
      // queue. Switch to "dnd" if your Termii account is provisioned
      // for it and delivery through generic is unreliable.
      channel: "generic",
    }),
  });

  // Termii sometimes reports a failure in the body while still
  // answering HTTP 200, so the body has to be inspected too.
  const body = (await response
    .json()
    .catch(() => null)) as { code?: string; message?: string } | null;

  const failedInBody = body?.code != null && body.code !== "ok";

  if (!response.ok || failedInBody) {
    const detail = body?.message ?? JSON.stringify(body);
    throw new Error(
      `Termii did not accept the message (HTTP ${response.status}): ${String(detail).slice(0, 300)}`,
    );
  }
}
