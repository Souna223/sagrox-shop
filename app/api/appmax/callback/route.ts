import { NextRequest, NextResponse } from "next/server";
import {
  generateAppmaxMerchantCreds,
  saveAppmaxInstallation,
  appmaxEnabled,
} from "@/lib/appmax";

type InstallCallbackBody = {
  app_id?: string;
  external_key?: string;
  client_key?: string;
  client_id?: string;
  client_secret?: string;
};

/**
 * Callback de instalação do Appmax.
 *
 * - POST: health-check enviado pelo Appmax após o merchant autorizar. Entrega
 *   diretamente as credenciais do merchant (client_id/client_secret).
 * - GET ?token=HASH: retorno do fluxo OAuth quando o Appmax redireciona o
 *   navegador de volta; o hash é trocado por credenciais do merchant via
 *   /app/client/generate.
 */
export async function POST(request: NextRequest) {
  try {
    if (!appmaxEnabled()) {
      return NextResponse.json({ ok: false, error: "AppMax não está habilitado." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as InstallCallbackBody;

    if (!body.app_id || !body.external_key || !body.client_key || !body.client_id || !body.client_secret) {
      return NextResponse.json(
        { ok: false, error: "app_id, external_key, client_key, client_id e client_secret são obrigatórios." },
        { status: 400 },
      );
    }

    const expectedAppId = process.env.APPMAX_APP_ID_NUMERIC;
    if (!expectedAppId || String(body.app_id) !== String(expectedAppId)) {
      console.error(`[appmax-callback] app_id incompatível: esperado ${expectedAppId}, recebido ${body.app_id}`);
      return NextResponse.json({ ok: false, error: "app_id inválido." }, { status: 400 });
    }

    if (body.client_key !== body.external_key) {
      console.error("[appmax-callback] client_key não corresponde a external_key");
      return NextResponse.json({ ok: false, error: "client_key inválido." }, { status: 400 });
    }

    const { externalId } = await saveAppmaxInstallation({
      appId: String(body.app_id),
      externalKey: body.external_key,
      merchantClientId: body.client_id,
      merchantClientSecret: body.client_secret,
    });

    console.log(`[appmax-callback] Instalação salva (external_key=${body.external_key})`);
    return NextResponse.json({ ok: true, external_id: externalId }, { status: 200 });
  } catch (error) {
    console.error("[appmax-callback] Erro ao processar callback:", error);
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

    const { clientId, clientSecret } = await generateAppmaxMerchantCreds(token);
    const appId = process.env.APPMAX_APP_ID_NUMERIC ?? "";
    const externalKey = process.env.APPMAX_EXTERNAL_KEY ?? "sagrox";

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
    console.error("[appmax-callback] Erro ao concluir instalação:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
