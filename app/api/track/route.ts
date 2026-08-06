import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, rateLimit, getClientIp, getGeoFromRequest } from "@/lib/api";
import { recordEvent, updateLiveVisitor } from "@/lib/tracking";
import type { AnalyticsEventType, DeviceType } from "@/generated/prisma/enums";

const VALID_TYPES = new Set<string>([
  "PAGE_VIEW",
  "VIEW_CONTENT",
  "SEARCH",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "BEGIN_CHECKOUT",
  "ADD_PAYMENT_INFO",
  "PURCHASE",
  "LEAD",
  "WISHLIST",
  "LOGIN",
  "SIGNUP",
  "CONTACT",
  "SHARE",
  "CUSTOM",
]);

type TrackBody = {
  sessionId?: string | null;
  eventType?: string;
  eventName?: string;
  pagePath?: string | null;
  referrer?: string | null;
  productId?: string | null;
  orderId?: string | null;
  value?: number | null;
  metadata?: Record<string, unknown> | null;
};

function detectDevice(userAgent: string): { device: DeviceType; browser: string; os: string } {
  const ua = userAgent.toLowerCase();
  const device: DeviceType = /ipad|tablet/.test(ua)
    ? "TABLET"
    : /mobi|iphone|android.*mobile/.test(ua)
      ? "MOBILE"
      : "DESKTOP";
  let browser = "Desconhecido";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\/|opera/.test(ua)) browser = "Opera";
  else if (/chrome\//.test(ua)) browser = "Chrome";
  else if (/safari\//.test(ua)) browser = "Safari";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  let os = "Desconhecido";
  if (/windows/.test(ua)) os = "Windows";
  else if (/mac os x/.test(ua)) os = "macOS";
  else if (/android/.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/.test(ua)) os = "iOS";
  else if (/linux/.test(ua)) os = "Linux";
  return { device, browser, os };
}

export async function POST(request: Request) {
  if (!rateLimit(`track:${getClientIp(request)}`, 120, 60)) {
    return fail("Muitas requisições.", 429);
  }

  try {
    const body = await parseJson<TrackBody>(request);
    const eventType = (body.eventType ?? "CUSTOM").toUpperCase();
    if (!VALID_TYPES.has(eventType)) {
      return fail("Tipo de evento inválido.");
    }

    const sessionId = body.sessionId ?? null;
    const userAgent = request.headers.get("user-agent") ?? "";
    const { device, browser, os } = detectDevice(userAgent);
    const geo = await getGeoFromRequest(request);

    await recordEvent({
      eventType: eventType as AnalyticsEventType,
      eventName: body.eventName || eventType,
      sessionId,
      productId: body.productId ?? null,
      orderId: body.orderId ?? null,
      pagePath: body.pagePath ?? null,
      referrer: body.referrer ?? null,
      value: body.value ?? undefined,
      metadata: body.metadata ?? null,
      ip: getClientIp(request),
      device,
      browser,
      os,
      country: geo.country,
      state: geo.state,
      city: geo.city,
      utmSource: body.metadata?.utm_source as string | null | undefined,
      utmMedium: body.metadata?.utm_medium as string | null | undefined,
      utmCampaign: body.metadata?.utm_campaign as string | null | undefined,
      utmContent: body.metadata?.utm_content as string | null | undefined,
      utmTerm: body.metadata?.utm_term as string | null | undefined,
    });

    if (sessionId && eventType === "PAGE_VIEW") {
      await updateLiveVisitor(sessionId, null, body.pagePath ?? "");
    }

    return ok({ eventId: "recorded" });
  } catch (error) {
    console.error("[track]", error);
    return fail("Erro ao registrar evento.", 500);
  }
}

export async function GET() {
  const count = await prisma.analyticsEvent.count();
  return ok({ total: count });
}
