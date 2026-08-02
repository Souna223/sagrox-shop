import type { Metadata } from "next";
import { startOfToday, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { FulfillmentView } from "@/components/admin/fulfillment-view";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Fulfillment",
};

const AWAITING_STATUSES: OrderStatus[] = ["PAID", "PROCESSING"];

export default async function AdminFulfillmentPage() {
  await requireAdmin();

  const [awaiting, shipped, awaitingCount, shippedTodayCount, shipments] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: AWAITING_STATUSES } },
      orderBy: { paidAt: "asc" },
      take: 100,
      select: {
        id: true,
        number: true,
        customerName: true,
        email: true,
        total: true,
        status: true,
        shippingAddress: true,
        shippingService: true,
        trackingCode: true,
        paidAt: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
      },
    }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "DELIVERED", "COMPLETED"] } } }),
    prisma.order.count({ where: { status: { in: AWAITING_STATUSES } } }),
    prisma.order.count({
      where: { status: "SHIPPED", shippedAt: { gte: startOfToday() } },
    }),
    prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        order: {
          select: { number: true, customerName: true, status: true, trackingCode: true, trackingUrl: true },
        },
      },
    }),
  ]);

  const serializedAwaiting = awaiting.map((order) => ({
    id: order.id,
    number: order.number,
    customerName: order.customerName,
    email: order.email,
    total: Number(order.total.toString()),
    status: order.status,
    shippingAddress: order.shippingAddress as Record<string, unknown> | null,
    shippingService: order.shippingService,
    trackingCode: order.trackingCode,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
  }));

  const serializedShipments = shipments.map((shipment) => ({
    id: shipment.id,
    provider: shipment.provider,
    service: shipment.service,
    trackingCode: shipment.trackingCode,
    status: shipment.status,
    createdAt: shipment.createdAt.toISOString(),
    order: {
      number: shipment.order.number,
      customerName: shipment.order.customerName,
      orderStatus: shipment.order.status,
      trackingCode: shipment.order.trackingCode,
      trackingUrl: shipment.order.trackingUrl,
    },
  }));

  return (
    <div className="space-y-6">
      <FulfillmentView
        awaiting={serializedAwaiting}
        shipments={serializedShipments}
        stats={{
          awaitingCount,
          shippedCount: shipped,
          shippedTodayCount,
          last7Days: await prisma.order.count({
            where: {
              status: { in: ["SHIPPED", "DELIVERED", "COMPLETED"] },
              shippedAt: { gte: startOfDay(subDays(new Date(), 6)) },
            },
          }),
        }}
      />
    </div>
  );
}
