import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { serializeRecord } from "@/lib/serialize";
import type { ReviewStatus } from "@/generated/prisma/enums";

const STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (STATUSES.includes(status as ReviewStatus)) {
      where.status = status as ReviewStatus;
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { comment: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total, pending] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ product: { name: "asc" } }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          product: { select: { id: true, name: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: "PENDING" } }),
    ]);

    return ok({
      items: items.map((r) => serializeRecord(r as never)),
      total,
      pending,
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
