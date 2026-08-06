import { prisma } from "@/lib/prisma";
import type { AnalyticsEventType, DeviceType } from "@/generated/prisma/enums";
import { randomUUID } from "crypto";

type TrackParams = {
  eventType: AnalyticsEventType;
  eventName: string;
  userId?: string | null;
  sessionId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  pagePath?: string | null;
  referrer?: string | null;
  value?: number;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  device?: DeviceType | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export async function recordEvent(params: TrackParams): Promise<void> {
  const eventId = randomUUID();
  const eventName = params.eventName || params.eventType;

  await prisma.analyticsEvent
    .create({
      data: {
        eventId,
        eventType: params.eventType,
        eventName,
        userId: params.userId ?? null,
        sessionId: params.sessionId ?? null,
        productId: params.productId ?? null,
        orderId: params.orderId ?? null,
        pagePath: params.pagePath ?? null,
        referrer: params.referrer ?? null,
        device: params.device ?? null,
        browser: params.browser ?? null,
        os: params.os ?? null,
        country: params.country ?? null,
        state: params.state ?? null,
        city: params.city ?? null,
        utmSource: params.utmSource ?? null,
        utmMedium: params.utmMedium ?? null,
        utmCampaign: params.utmCampaign ?? null,
        utmContent: params.utmContent ?? null,
        utmTerm: params.utmTerm ?? null,
        value: params.value ?? null,
        metadata: (params.metadata ?? null) as never,
      },
    })
    .catch((err) => {
      console.error("[tracking] Falha ao registrar evento:", err);
    });
}

export async function updateLiveVisitor(sessionId: string, userId: string | null, page: string): Promise<void> {
  await prisma.sessionActivity
    .upsert({
      where: { sessionId },
      create: { sessionId, userId, page, pageVisits: [page] as never },
      update: {
        userId,
        page,
        lastActiveAt: new Date(),
        pageVisits: { push: page } as never,
      },
    })
    .catch(() => {});
}

export async function sendMetaCAPIEvent(
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;
  if (!accessToken || !pixelId) return;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: (data.eventId as string) ?? randomUUID(),
        action_source: "website",
        event_source_url: (data.pagePath as string) ?? undefined,
        user_data: {
          em: (data.email as string)?.toLowerCase()?.trim() ?? undefined,
          ph: (data.phone as string)?.replace(/\D/g, "") ?? undefined,
          client_ip_address: (data.ip as string) ?? undefined,
          client_user_agent: (data.userAgent as string) ?? undefined,
          fbc: (data.fbc as string) ?? undefined,
          fbp: (data.fbp as string) ?? undefined,
        },
        custom_data: data.customData as Record<string, unknown> | undefined,
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      console.error("[meta-capi]", await response.text());
    }
  } catch (err) {
    console.error("[meta-capi] Falha ao enviar evento:", err);
  }
}

export async function sendGA4Event(
  eventName: string,
  params: Record<string, unknown>,
): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const payload = {
    client_id: (params.clientId as string) ?? randomUUID(),
    events: [
      {
        name: eventName,
        params: { ...params, engagement_time_msec: 1 },
      },
    ],
  };

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.error("[ga4] Falha ao enviar evento:", err);
  }
}
