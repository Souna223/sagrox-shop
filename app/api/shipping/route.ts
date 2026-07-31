import { shippingSchema } from "@/lib/validators";
import { ok, fail, handleError, parseJson, rateLimit, getClientIp } from "@/lib/api";
import { resolveCartItems, getShippingOptions } from "@/lib/checkout";
import { onlyDigits } from "@/lib/br";

export async function POST(request: Request) {
  if (!rateLimit(`shipping:${getClientIp(request)}`, 30, 60)) {
    return fail("Muitas consultas. Tente novamente em instantes.", 429);
  }

  try {
    const body = await parseJson(request);
    const parsed = shippingSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

    const { cep, items } = parsed.data;
    const resolved = await resolveCartItems(items);
    const options = await getShippingOptions(onlyDigits(cep), resolved);

    return ok(options);
  } catch (error) {
    return handleError(error);
  }
}
