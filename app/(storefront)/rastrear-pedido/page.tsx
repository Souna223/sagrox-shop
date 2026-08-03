import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/page-header";
import { TrackOrderForm } from "@/components/storefront/track-order-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.pages.trackOrderTitle,
    description: t.pages.trackOrderDescription,
  };
}

export default async function TrackOrderPage() {
  const t = await getDictionary();

  return (
    <div>
      <PageHeader title={t.pages.trackOrderTitle} description={t.pages.trackOrderDescription} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Informe o número do pedido e o e-mail usado na compra para acompanhar o status da entrega.
        </p>
        <TrackOrderForm
          t={{
            trackOrderNumber: t.pages.trackOrderNumber,
            trackOrderNumberPlaceholder: t.pages.trackOrderNumberPlaceholder,
            trackOrderEmail: t.pages.trackOrderEmail,
            trackOrderEmailPlaceholder: t.pages.trackOrderEmailPlaceholder,
            trackOrderButton: t.pages.trackOrderButton,
            trackOrderSearching: t.pages.trackOrderSearching,
            trackOrderNotFound: t.pages.trackOrderNotFound,
            trackOrderError: t.pages.trackOrderError,
            trackOrderSection: t.pages.trackOrderSection,
            trackOrderStatus: t.pages.trackOrderStatus,
            trackOrderTracking: t.pages.trackOrderTracking,
            trackOrderTrackNow: t.pages.trackOrderTrackNow,
            trackOrderItems: t.pages.trackOrderItems,
            trackOrderTotal: t.pages.trackOrderTotal,
            trackOrderDate: t.pages.trackOrderDate,
            trackOrderShipping: t.pages.trackOrderShipping,
          }}
        />
      </div>
    </div>
  );
}
