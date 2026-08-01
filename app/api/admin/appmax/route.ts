import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import {
  appmaxEnabled,
  appmaxReady,
  getAppmaxInstallation,
  isAppmaxConfigured,
  authorizeAppmaxInstall,
} from "@/lib/appmax";

export async function GET() {
  try {
    await requireAdmin();

    const installation = await getAppmaxInstallation();
    return NextResponse.json({
      ok: true,
      data: {
        configured: isAppmaxConfigured(),
        enabled: appmaxEnabled(),
        installed: await appmaxReady(),
        externalKey: installation?.externalKey ?? null,
        merchantClientId: installation?.merchantClientId
          ? `${installation.merchantClientId.slice(0, 6)}…`
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    if (!appmaxEnabled() || !isAppmaxConfigured()) {
      return NextResponse.json({ ok: false, error: "AppMax não está configurado." }, { status: 400 });
    }

    const appId = process.env.APPMAX_APP_ID_UUID;
    if (!appId) {
      return NextResponse.json(
        { ok: false, error: "APPMAX_APP_ID_UUID não configurado." },
        { status: 400 },
      );
    }

    const externalKey = process.env.APPMAX_EXTERNAL_KEY ?? "sagrox";
    const baseUrl = process.env.APPMAX_CALLBACK_BASE_URL ?? process.env.NEXTAUTH_URL ?? `${request.nextUrl.origin}`;
    const urlCallback = `${baseUrl.replace(/\/$/, "")}/api/appmax/callback`;

    const { redirectUrl } = await authorizeAppmaxInstall({ appId, externalKey, urlCallback });

    return NextResponse.json({ ok: true, data: { redirectUrl } });
  } catch (error) {
    console.error("[admin-appmax] Erro ao iniciar instalação:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
