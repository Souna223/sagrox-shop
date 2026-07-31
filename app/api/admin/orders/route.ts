import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeAdminOrder } from "@/lib/admin-orders";
import type { OrderStatus } from "@/generated/prisma/enums";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (q) {
      const numericQ = Number(q);
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        ...(Number.isInteger(numericQ)
          ? [{ number: numericQ }]
          : []),
      ];
    }
    if (ORDER_STATUSES.includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          number: true,
          customerName: true,
          email: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return ok({
      items: items.map((order) => serializeAdminOrder(order as never)),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}

export function POST() {
  return fail("Operação não suportada.", 405);
}
