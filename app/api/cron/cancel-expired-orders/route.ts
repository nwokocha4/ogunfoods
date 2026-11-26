// Vercel calls this every few minutes. An order that has sat at
// "received" past its 30-minute payment window is cancelled here.
//
// This job is not a signed-in customer or agent, so it cannot use the
// cookie-based Supabase client. It uses the service role key instead, which
// stays on the server and is never sent to a browser.
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CANCELLED_STATUS, ORDER_STATUSES } from "@/lib/order-status";

// node:crypto is used for the secret check, so this cannot run on the Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronRequest(request: Request, secret: string): boolean {
const authorization = request.headers.get("authorization");
if (!authorization?.startsWith("Bearer ")) return false;

// Compare fixed-length buffers so a wrong secret cannot be guessed one
// character at a time from how long the check takes.
const supplied = Buffer.from(authorization.slice("Bearer ".length));
const expected = Buffer.from(secret);
return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
const secret = process.env.CRON_SECRET;
if (!secret) {
console.error("CRON_SECRET is not set — refusing cron request.");
return NextResponse.json(
{ error: "Server is not configured for cron." },
{ status: 500 },
);
}

if (!isCronRequest(request, secret)) {
return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
console.error("Cron database settings are missing — no orders were cancelled.");
return NextResponse.json(
{ error: "Server is not configured for cron." },
{ status: 500 },
);
}

const supabase = createClient(url, serviceKey, {
auth: { persistSession: false, autoRefreshToken: false },
});

// One UPDATE covers every expired order. Checking that payment is still
// unconfirmed also protects an order being confirmed at this same moment.
const { data, error } = await supabase
.from("orders")
.update({ status: CANCELLED_STATUS })
.eq("status", ORDER_STATUSES[0]) // "received" is first in the shared list
.lte("expires_at", new Date().toISOString())
.is("payment_confirmed_at", null)
.select("reference");

if (error) {
console.error("Auto-cancel failed:", error);
return NextResponse.json(
{ error: "Could not cancel expired orders." },
{ status: 500 },
);
}

const references = (data ?? []).map((order) => order.reference);
console.log(`Auto-cancel: ${references.length} order(s) cancelled.`, references);

return NextResponse.json(
{ cancelled: references.length, references },
{ headers: { "Cache-Control": "no-store" } },
);
}
