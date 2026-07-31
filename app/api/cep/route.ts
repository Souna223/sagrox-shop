import { lookupCEP, onlyDigits } from "@/lib/br";
import { ok, fail, rateLimit } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cep = onlyDigits(searchParams.get("cep") ?? "");
  if (cep.length !== 8) return fail("CEP inválido.", 400);

  if (!rateLimit(`cep:${cep}`, 20, 60)) {
    return fail("Muitas consultas. Tente novamente em instantes.", 429);
  }

  const address = await lookupCEP(cep);
  if (!address) return fail("CEP não encontrado.", 404);

  return ok({
    zip: address.cep.replace(/\D/g, ""),
    street: address.logradouro,
    complement: address.complemento,
    neighborhood: address.bairro,
    city: address.localidade,
    state: address.uf,
  });
}
