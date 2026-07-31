import { validateCouponSchema } from "@/lib/validators";
import { ok, fail, handleError, parseJson, rateLimit, getClientIp } from "@/lib/api";
import { validateCoupon } from "@/lib/checkout";

export async function POST(request: Request) {
  if (!rateLimit(`coupon:${getClientIp(request)}`, 30, 60)) {
    return fail("Muitas tentativas. Tente novamente em instantes.", 429);
  }

  try {
    const body = await parseJson(request);
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

    const { code, subtotal } = parsed.data;
    const coupon = await validateCoupon(code, subtotal);
    return ok(coupon);
  } catch (error) {
    if (error instanceof Error) return fail(error.message, 400);
    return handleError(error);
  }
}
