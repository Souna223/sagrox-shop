import { NextRequest, NextResponse } from "next/server";
import {
  generateAppmaxMerchantCreds,
  saveAppmaxInstallation,
  getAppmaxInstallation,
  validateAppmaxInstallation,
  appmaxEnabled,
} from "@/lib/appmax";

type ValidationBody = {
  app_id?: number | string;
  client_id?: string;
  client_secret?: string;
  client_key?: string;
  external_key?: string;
};

/**
 * Callback de instalação do Appmax.
 *
 * - POST: URL de validação (health check) chamada server-to-server pela Appmax
 *   durante `POST /app/client/generate`. A Appmax valida apenas a presença de
 *   `app_id` (Numerical ID) e espera HTTP 200 exato com `external_id` UUID novo
 *   por instalação. Sem isso o generate é abortado com 500 e nenhuma credencial
 *   de merchant é emitida.
 * - GET ?token=HASH: retorno do fluxo OAuth quando o Appmax redireciona o
 *   navegador de volta; o hash é trocado por credenciais do merchant via
 *   /app/client/generate.
 */
export async function POST(request: NextRequest) {
  try {
    if (!appmaxEnabled()) {
      return NextResponse.json({ ok: false, error: "AppMax não está habilitado." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as ValidationBody;

    const appId = body.app_id;
    if (appId === undefined || appId === null || appId === "") {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    const { externalId, alias } = await validateAppmaxInstallation({
      appId: String(appId),
      clientId: body.client_id,
      clientSecret: body.client_secret,
      externalKey: body.external_key ?? body.client_key,
      alias: undefined,
    });

    console.log(`[appmax-callback] health check concluído (app_id=${appId}, external_id=${externalId})`);
    return NextResponse.json({ external_id: externalId, alias }, { status: 200 });
  } catch (error) {
    console.error("[appmax-callback] Erro ao processar health check:", error);
    return NextResponse.json({ ok: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!appmaxEnabled()) {
      return NextResponse.json({ ok: false, error: "AppMax não está habilitado." }, { status: 400 });
    }

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ ok: true, message: "Nenhum token recebido." });
    }

    const appId = process.env.APPMAX_APP_ID_NUMERIC ?? "";
    const externalKey = process.env.APPMAX_EXTERNAL_KEY ?? "sagrox";

    try {
      const { clientId, clientSecret } = await generateAppmaxMerchantCreds(token);
      const { externalId } = await saveAppmaxInstallation({
        appId,
        externalKey,
        merchantClientId: clientId,
        merchantClientSecret: clientSecret,
      });
      console.log(`[appmax-callback] Credenciais de merchant geradas (external_id=${externalId})`);
      return NextResponse.json({
        ok: true,
        message: "Instalação AppMax concluída.",
        external_id: externalId,
      });
    } catch (error) {
      const existing = await getAppmaxInstallation();
      if (existing) {
        console.log(
          `[appmax-callback] Geração via token falhou mas a instalação já existe via health check (external_id=${existing.id})`,
        );
        return NextResponse.json({
          ok: true,
          message: "Instalação AppMax já concluída via health check.",
          external_id: existing.id,
        });
      }
      console.error("[appmax-callback] Erro ao concluir instalação:", error);
      const message = error instanceof Error ? error.message : "Erro interno do servidor.";
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  } catch (error) {
    console.error("[appmax-callback] Erro ao processar callback:", error);
    return NextResponse.json({ ok: false, error: "Erro interno do servidor." }, { status: 500 });
  }
}
