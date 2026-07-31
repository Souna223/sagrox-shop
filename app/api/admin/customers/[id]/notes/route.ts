import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ok, fail, handleError, getClientIp } from "@/lib/api";
import { auditLog } from "@/lib/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const notes = await prisma.customerNote.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
    });
    return ok(notes);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();
    if (!content) return fail("Informe o conteúdo da nota.");

    const customer = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!customer) return fail("Cliente não encontrado.", 404);

    const note = await prisma.customerNote.create({
      data: { customerId: id, adminId: admin.id, content },
    });

    await auditLog({
      userId: admin.id,
      action: "CUSTOMER_NOTE_ADD",
      entityType: "User",
      entityId: id,
      details: { noteId: note.id },
      ip: getClientIp(request),
    });

    return ok(note, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
