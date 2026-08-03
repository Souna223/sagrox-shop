import { z } from "zod";
import { fail, ok, rateLimit, getClientIp } from "@/lib/api";
import { sendEmail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome.").max(120),
  email: z.string().email("E-mail inválido.").max(254),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres.").max(4000),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`contact:${ip}`, 3, 300)) {
      return fail("Muitas mensagens enviadas. Aguarde alguns minutos.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Dados inválidos.", 422);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.", 422);
    }

    const { name, email, message } = parsed.data;
    const settings = await getSettings();
    const to = settings.email || process.env.SMTP_USER || "";
    if (!to) return fail("Atendimento indisponível no momento.", 503);

    const html = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;background-color:#f3f4f6;padding:24px">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e7ec">
              <tr>
                <td style="padding:20px 28px;background-color:#c81e2e;color:#ffffff;font-size:18px;font-weight:bold">Novo contato pelo site</td>
              </tr>
              <tr>
                <td style="padding:24px 28px;font-size:14px;color:#1f2933;line-height:1.7">
                  <p style="margin:0 0 16px">Você recebeu uma nova mensagem do formulário de contato.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e7ec;border-radius:8px">
                    <tr>
                      <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;color:#6e7a8a;width:120px">Nome</td>
                      <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;font-weight:600">${escapeHtml(name)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;color:#6e7a8a">E-mail</td>
                      <td style="padding:10px 14px;border-bottom:1px solid #e4e7ec;font-weight:600">${escapeHtml(email)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;color:#6e7a8a">Mensagem</td>
                      <td style="padding:10px 14px;white-space:pre-line">${escapeHtml(message)}</td>
                    </tr>
                  </table>
                  <p style="margin:16px 0 0;font-size:12px;color:#6e7a8a">Responda direto para <a href="mailto:${escapeHtml(email)}" style="color:#c81e2e">${escapeHtml(email)}</a> ou acesse ${SITE_NAME} (${SITE_URL}).</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;

    const sent = await sendEmail({ to, subject: `Novo contato — ${name}`, html });
    if (!sent) return fail("Não foi possível enviar sua mensagem agora. Tente novamente.", 500);

    return ok({ message: "Mensagem enviada." });
  } catch (error) {
    console.error("[contact]", error);
    return fail("Erro ao enviar sua mensagem. Tente novamente.", 500);
  }
}
