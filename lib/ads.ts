import { prisma } from "@/lib/prisma";
import { createHash, randomUUID } from "crypto";

export type AdsSettings = {
  metaPixelId: string;
  metaAccessToken: string;
  metaTestEventCode: string;
  tiktokPixelId: string;
  tiktokAccessToken: string;
  tiktokTestEventCode: string;
};

const ADS_KEYS = [
  "metaPixelId",
  "metaAccessToken",
  "metaTestEventCode",
  "tiktokPixelId",
  "tiktokAccessToken",
  "tiktokTestEventCode",
] as const;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function envAdSettings(): AdsSettings {
  return {
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || "",
    metaAccessToken: process.env.META_ACCESS_TOKEN || "",
    metaTestEventCode: process.env.META_TEST_EVENT_CODE || "",
    tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
    tiktokAccessToken: process.env.TIKTOK_ACCESS_TOKEN || "",
    tiktokTestEventCode: process.env.TIKTOK_TEST_EVENT_CODE || "",
  };
}

export async function getAdsSettings(): Promise<AdsSettings> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [...ADS_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const env = envAdSettings();
    return {
      metaPixelId: str(map.metaPixelId) || env.metaPixelId,
      metaAccessToken: str(map.metaAccessToken) || env.metaAccessToken,
      metaTestEventCode: str(map.metaTestEventCode) || env.metaTestEventCode,
      tiktokPixelId: str(map.tiktokPixelId) || env.tiktokPixelId,
      tiktokAccessToken: str(map.tiktokAccessToken) || env.tiktokAccessToken,
      tiktokTestEventCode: str(map.tiktokTestEventCode) || env.tiktokTestEventCode,
    };
  } catch {
    return envAdSettings();
  }
}

export async function saveAdsSettings(patch: Partial<AdsSettings>): Promise<AdsSettings> {
  for (const key of ADS_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value).trim() },
      create: { key, value: String(value).trim() },
    });
  }
  return getAdsSettings();
}

export type AdUserData = {
  email?: string | null;
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type AdEventData = {
  eventId: string;
  value?: number;
  currency?: string;
  productId?: string | null;
  contentIds?: string[];
  contents?: { id: string; quantity?: number; price?: number }[];
  pagePath?: string | null;
  user?: AdUserData;
};

type AdEventType = "view_content" | "add_to_cart" | "begin_checkout" | "payment_info" | "purchase";

const META_EVENT_NAMES: Record<AdEventType, string> = {
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  payment_info: "AddPaymentInfo",
  purchase: "Purchase",
};

const TIKTOK_EVENT_NAMES: Record<AdEventType, string> = {
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  payment_info: "AddPaymentInfo",
  purchase: "CompletePayment",
};

function hashValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

async function sendMetaEvent(
  settings: AdsSettings,
  type: AdEventType,
  data: AdEventData,
): Promise<void> {
  if (!settings.metaPixelId || !settings.metaAccessToken) return;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: META_EVENT_NAMES[type],
        event_time: Math.floor(Date.now() / 1000),
        event_id: data.eventId,
        action_source: "website",
        event_source_url: data.pagePath ?? undefined,
        user_data: {
          em: hashValue(data.user?.email),
          ph: hashValue(data.user?.phone),
          client_ip_address: data.user?.ip ?? undefined,
          client_user_agent: data.user?.userAgent ?? undefined,
          fbp: data.user?.fbp ?? undefined,
          fbc: data.user?.fbc ?? undefined,
        },
        custom_data: {
          currency: data.currency ?? "BRL",
          value: data.value ?? 0,
          content_ids: data.contentIds ?? (data.productId ? [data.productId] : undefined),
          contents: data.contents,
        },
      },
    ],
  };
  if (settings.metaTestEventCode) payload.test_event_code = settings.metaTestEventCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${settings.metaPixelId}/events?access_token=${settings.metaAccessToken}`,
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

async function sendTikTokEvent(
  settings: AdsSettings,
  type: AdEventType,
  data: AdEventData,
): Promise<void> {
  if (!settings.tiktokAccessToken) return;

  const contentIds = data.contentIds?.filter(Boolean) ?? (data.productId ? [data.productId] : []);

  const contents = data.contents
    ? data.contents
        .filter((c) => c.id)
        .map((c) => ({
          content_id: c.id,
          content_type: "product",
          quantity: c.quantity ?? 1,
          price: c.price ?? data.value ?? undefined,
        }))
    : contentIds.length > 0
      ? contentIds.map((id) => ({
          content_id: id,
          content_type: "product",
          quantity: 1,
          price: data.value ?? undefined,
        }))
      : undefined;

  const properties: Record<string, unknown> = {
    currency: data.currency ?? "BRL",
    value: data.value ?? 0,
    content_type: "product",
  };
  if (contentIds.length > 0) properties.content_ids = contentIds;
  if (contents && contents.length > 0) properties.contents = contents;

  const event: Record<string, unknown> = {
    event: TIKTOK_EVENT_NAMES[type],
    event_id: data.eventId,
    event_time: Math.floor(Date.now() / 1000),
    page: { url: data.pagePath ?? undefined },
    user: {
      em: hashValue(data.user?.email),
      ph: hashValue(data.user?.phone),
      ip: data.user?.ip ?? undefined,
      ua: data.user?.userAgent ?? undefined,
    },
    properties,
  };
  if (settings.tiktokTestEventCode) event.test_event_code = settings.tiktokTestEventCode;

  const payload = {
    event_source: "web",
    event_source_id: settings.tiktokPixelId,
    data: [event],
  };

  try {
    const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": settings.tiktokAccessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    if (!response.ok || !raw.includes('"code":0')) {
      console.error(`[tiktok-events] ${type} HTTP ${response.status}:`, raw.slice(0, 500));
    } else {
      console.log(`[tiktok-events] ${type} enviado com sucesso:`, raw.slice(0, 200));
    }
  } catch (err) {
    console.error("[tiktok-events] Falha ao enviar evento:", err);
  }
}

export async function fireAdEvent(
  type: AdEventType,
  data: AdEventData,
): Promise<void> {
  try {
    const settings = await getAdsSettings();
    await Promise.allSettled([
      sendMetaEvent(settings, type, data),
      sendTikTokEvent(settings, type, data),
    ]);
  } catch (err) {
    console.error("[ads] Falha ao disparar evento:", err);
  }
}

export function newAdEventId(prefix = "ev"): string {
  return `${prefix}_${randomUUID()}`;
}