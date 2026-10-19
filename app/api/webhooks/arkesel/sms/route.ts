import { NextResponse } from "next/server";
import { applySmsDeliveryEvent } from "@/lib/smsCampaigns/deliveryRepository";
import { verifyArkeselDeliverySignature } from "@/lib/smsCampaigns/deliveryWebhook";

export async function GET(request: Request) {
  const secrets = [
    process.env.ARKESEL_WEBHOOK_SECRET,
    process.env.ARKESEL_WEBHOOK_SECRET_PREVIOUS,
  ].filter((secret): secret is string => Boolean(secret?.trim())).map((secret) => secret.trim());
  const url = new URL(request.url);
  const event = verifyArkeselDeliverySignature({
    query: url.searchParams,
    timestampHeader: request.headers.get("x-arkesel-webhook-timestamp"),
    signatureHeader: request.headers.get("x-arkesel-webhook-signature"),
    callbackIdHeader: request.headers.get("x-arkesel-webhook-id"),
    secrets,
  });
  if (!event) return NextResponse.json({ error: "Invalid callback signature or event." }, { status: 401 });

  try {
    const outcome = await applySmsDeliveryEvent({
      callbackId: event.callbackId,
      smsId: event.smsId,
      providerStatus: event.status,
      timestamp: event.timestamp,
    });
    if (outcome === "ignored") return NextResponse.json({ error: "Delivery event could not be applied." }, { status: 503 });
    return NextResponse.json({ received: true, duplicate: outcome === "duplicate" });
  } catch {
    return NextResponse.json({ error: "Delivery event could not be applied." }, { status: 503 });
  }
}
