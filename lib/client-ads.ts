"use client";

declare global {
  interface Window {
    ttq?: {
      track: (event: string, properties?: Record<string, unknown>, options?: { event_id?: string }) => void;
    };
    fbq?: (...args: unknown[]) => void;
  }
}

export type ClientAdEventInput = {
  productId?: string | null;
  contentIds?: string[] | null;
  contents?: { id: string; quantity?: number; price?: number }[] | null;
  value?: number | null;
};

const TIKTOK_EVENT_MAP: Record<string, string> = {
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  BEGIN_CHECKOUT: "InitiateCheckout",
  ADD_PAYMENT_INFO: "AddPaymentInfo",
};

const META_EVENT_MAP: Record<string, string> = {
  VIEW_CONTENT: "ViewContent",
  ADD_TO_CART: "AddToCart",
  BEGIN_CHECKOUT: "InitiateCheckout",
  ADD_PAYMENT_INFO: "AddPaymentInfo",
};

export function newClientAdEventId(prefix = "ev"): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${id}`;
}

export function fireClientAdEvent(
  eventType: string,
  data: ClientAdEventInput,
  eventId: string,
): void {
  const tiktokEvent = TIKTOK_EVENT_MAP[eventType];
  const metaEvent = META_EVENT_MAP[eventType];
  if (!tiktokEvent && !metaEvent) return;
  if (typeof window === "undefined") return;

  const contentIds =
    data.contentIds?.filter(Boolean) ?? (data.productId ? [data.productId] : []);
  const value = data.value ?? undefined;
  const contents = data.contents
    ?.filter((c) => c.id)
    .map((c) => ({
      content_id: c.id,
      content_type: "product",
      quantity: c.quantity ?? 1,
      price: c.price ?? undefined,
    }));

  try {
    if (tiktokEvent && typeof window.ttq?.track === "function") {
      const properties: Record<string, unknown> = {
        content_type: "product",
        currency: "BRL",
        value,
      };
      if (contentIds.length > 0) {
        properties.content_id = contentIds[0];
        properties.content_ids = contentIds;
      }
      if (contents && contents.length > 0) properties.contents = contents;
      window.ttq?.track(tiktokEvent, properties, { event_id: eventId });
    }

    if (metaEvent && typeof window.fbq === "function") {
      const properties: Record<string, unknown> = {
        content_type: "product",
        currency: "BRL",
        value,
      };
      if (contentIds.length > 0) properties.content_ids = contentIds;
      if (contents && contents.length > 0) properties.contents = contents;
      window.fbq("track", metaEvent, properties, { eventID: eventId });
    }
  } catch {
    // tracking must never break the page
  }
}