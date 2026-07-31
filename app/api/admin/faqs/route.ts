import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError } from "@/lib/api";
import { faqSchema, serializeFaq } from "@/lib/admin-content";
import { auditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim();
    const active = (searchParams.get("active") ?? "ALL").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = 15;

    const where: Record<string, unknown> = {};
    if (q) where.question = { contains: q, mode: "insensitive" };
    if (active === "ACTIVE") where.active = true;
    if (active === "INACTIVE") where.active = false;

    const [items, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.fAQ.count({ where }),
    ]);

    return ok({
      items: items.map((f) => serializeFaq(f as never)),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const data = parsed.data;
    const faq = await prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        sortOrder: data.sortOrder,
        active: data.active,
      },
    });

    await auditLog({
      userId: admin.id,
      action: "FAQ.CRIADO",
      entityType: "faq",
      entityId: faq.id,
      details: { question: data.question },
    });

    return ok(serializeFaq(faq as never), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
