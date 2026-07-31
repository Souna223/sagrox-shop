import { prisma } from "@/lib/prisma";
import { newsletterSchema } from "@/lib/validators";
import { ok, fail, handleError, parseJson, rateLimit } from "@/lib/api";

export async function POST(request: Request) {
  if (!rateLimit(`newsletter:${request.headers.get("x-forwarded-for") ?? "unknown"}`, 10, 60)) {
    return fail("Muitas tentativas. Tente novamente em instantes.", 429);
  }

  try {
    const body = await parseJson<{ email: string; name?: string }>(request);
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

    const { email, name } = parsed.data;

    const subscriber = await prisma.subscriber.upsert({
      where: { email: email.toLowerCase() },
      update: { status: "ACTIVE" },
      create: { email: email.toLowerCase(), name, source: "newsletter" },
    });

    return ok(subscriber);
  } catch (error) {
    return handleError(error);
  }
}
