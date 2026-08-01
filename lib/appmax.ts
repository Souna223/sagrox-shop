import { prisma } from "@/lib/prisma";

const ENVIRONMENTS = {
  sandbox: {
    auth: "https://auth.sandboxappmax.com.br",
    api: "https://api.sandboxappmax.com.br",
    admin: "https://breakingcode.sandboxappmax.com.br",
  },
  production: {
    auth: "https://auth.appmax.com.br",
    api: "https://api.appmax.com.br",
    admin: "https://admin.appmax.com.br",
  },
} as const;

export type AppmaxEnv = keyof typeof ENVIRONMENTS;

function envConfig(): { authUrl: string; apiUrl: string; adminUrl: string } {
  const env: AppmaxEnv = process.env.APPMAX_ENV === "production" ? "production" : "sandbox";
  const base = ENVIRONMENTS[env];
  return {
    authUrl: process.env.APPMAX_AUTH_URL ?? base.auth,
    apiUrl: process.env.APPMAX_API_URL ?? base.api,
    adminUrl: process.env.APPMAX_ADMIN_URL ?? base.admin,
  };
}

export function isAppmaxConfigured(): boolean {
  return Boolean(process.env.APPMAX_CLIENT_ID && process.env.APPMAX_CLIENT_SECRET);
}

export function appmaxEnabled(): boolean {
  return isAppmaxConfigured() && process.env.APPMAX_ENABLED !== "false";
}

/**
 * AppMax está configurado (env) e possui credenciais de merchant instaladas?
 * Comercio só funciona após a instalação OAuth gerar as credenciais do merchant.
 */
export async function appmaxReady(): Promise<boolean> {
  if (!appmaxEnabled()) return false;
  const inst = await prisma.appmaxInstallation.findFirst();
  return Boolean(inst && inst.merchantClientId && inst.merchantClientSecret);
}

let appTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * App-level token. Escopo limitado: usado apenas para a instalação do app
 * (/app/authorize e /app/client/generate). Não executa transações.
 */
export async function getAppmaxAppToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 60_000) {
    return appTokenCache.token;
  }

  const clientId = process.env.APPMAX_CLIENT_ID;
  const clientSecret = process.env.APPMAX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AppMax não está configurado (APPMAX_CLIENT_ID / APPMAX_CLIENT_SECRET).");
  }

  const { authUrl } = envConfig();
  const res = await fetch(`${authUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      `Falha na autenticação AppMax (${res.status}): ${json.error ?? "erro desconhecido"} ${
        json.error_description ?? ""
      }`.trim(),
    );
  }

  const expiresIn = Number(json.expires_in ?? 3600);
  appTokenCache = { token: json.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return json.access_token;
}

// ---------------------------------------------------------------------------
// Instalação (App credentials)
// ---------------------------------------------------------------------------

export async function authorizeAppmaxInstall(input: {
  appId: string;
  externalKey: string;
  urlCallback: string;
}): Promise<{ hash: string; redirectUrl: string }> {
  const token = await getAppmaxAppToken();
  const { apiUrl, adminUrl } = envConfig();

  const res = await fetch(`${apiUrl}/app/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      app_id: input.appId,
      external_key: input.externalKey,
      url_callback: input.urlCallback,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { token?: string };
    error?: string;
    message?: string;
  };

  if (!res.ok || !json.data?.token) {
    throw new Error(
      `Erro AppMax /app/authorize (${res.status}): ${json.error ?? json.message ?? "resposta inválida"}`,
    );
  }

  return {
    hash: json.data.token,
    redirectUrl: `${adminUrl}/appstore/integration/${json.data.token}`,
  };
}

export async function generateAppmaxMerchantCreds(hash: string): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const token = await getAppmaxAppToken();
  const { apiUrl } = envConfig();

  const res = await fetch(`${apiUrl}/app/client/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ token: hash }),
  });

  const raw = await res.text().catch(() => "");
  const json = (raw ? JSON.parse(raw) : {}) as {
    data?: { client?: { client_id?: string; client_secret?: string } };
    error?: string;
    message?: string;
  };

  if (!res.ok || !json.data?.client?.client_id || !json.data?.client?.client_secret) {
    throw new Error(
      `Erro AppMax /app/client/generate (${res.status}): ${json.error ?? json.message ?? (raw || "resposta inválida")}`,
    );
  }

  return {
    clientId: json.data.client.client_id,
    clientSecret: json.data.client.client_secret,
  };
}

export async function saveAppmaxInstallation(input: {
  appId: string;
  externalKey: string;
  merchantClientId: string;
  merchantClientSecret: string;
}): Promise<{ externalId: string }> {
  const row = await prisma.appmaxInstallation.upsert({
    where: { externalKey: input.externalKey },
    update: {
      appId: input.appId,
      merchantClientId: input.merchantClientId,
      merchantClientSecret: input.merchantClientSecret,
    },
    create: {
      appId: input.appId,
      externalKey: input.externalKey,
      merchantClientId: input.merchantClientId,
      merchantClientSecret: input.merchantClientSecret,
    },
  });
  return { externalId: row.id };
}

export async function getAppmaxInstallation() {
  return prisma.appmaxInstallation.findFirst();
}

// ---------------------------------------------------------------------------
// Comércio (Merchant credentials)
// ---------------------------------------------------------------------------

let merchantTokenCache: { token: string; expiresAt: number } | null = null;

async function getAppmaxMerchantToken(): Promise<string> {
  if (merchantTokenCache && merchantTokenCache.expiresAt > Date.now() + 60_000) {
    return merchantTokenCache.token;
  }

  const inst = await getAppmaxInstallation();
  if (!inst) {
    throw new Error("AppMax não está instalado. Complete a instalação no painel administrativo.");
  }

  const { authUrl } = envConfig();
  const res = await fetch(`${authUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: inst.merchantClientId,
      client_secret: inst.merchantClientSecret,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      `Falha na autenticação AppMax (merchant) (${res.status}): ${json.error ?? "erro desconhecido"} ${
        json.error_description ?? ""
      }`.trim(),
    );
  }

  const expiresIn = Number(json.expires_in ?? 3600);
  merchantTokenCache = { token: json.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return json.access_token;
}

function appmaxErrorDetail(json: Record<string, unknown>): string {
  if (typeof json.error === "string" && json.error) return json.error;
  if (json.errors && typeof json.errors === "object") {
    const fields = Object.entries(json.errors as Record<string, unknown>);
    const msgs: string[] = [];
    for (const [field, value] of fields) {
      if (Array.isArray(value)) msgs.push(`${field}: ${value.join("; ")}`);
    }
    if (msgs.length) return msgs.join(" | ");
  }
  if (typeof json.message === "string" && json.message) return json.message;
  if (Array.isArray(json.message) && json.message.length) return json.message.join(" | ");
  return "resposta inválida";
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAppmaxMerchantToken();
  const { apiUrl } = envConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text().catch(() => "");
  const json = (raw ? JSON.parse(raw) : {}) as Record<string, unknown> & { data?: T };

  if (!res.ok || json.error) {
    const detail = appmaxErrorDetail(json);
    const rawSnippet = raw ? ` — body: ${raw.slice(0, 500)}` : " (body vazio)";
    console.error(`[appmax-debug] ${path} -> ${res.status}`, { requestBody: body, rawBody: raw });
    throw new Error(`Erro AppMax ${path} (${res.status}): ${detail}${rawSnippet}`);
  }

  const data = json.data;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`AppMax retornou resposta vazia em ${path}.`);
  }

  return data;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAppmaxMerchantToken();
  const { apiUrl } = envConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw = await res.text().catch(() => "");
  const json = (raw ? JSON.parse(raw) : {}) as Record<string, unknown> & { data?: T };

  if (!res.ok || json.error) {
    const detail = appmaxErrorDetail(json);
    const rawSnippet = raw ? ` — body: ${raw.slice(0, 500)}` : " (body vazio)";
    throw new Error(`Erro AppMax GET ${path} (${res.status}): ${detail}${rawSnippet}`);
  }

  const data = json.data;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`AppMax retornou resposta vazia em GET ${path}.`);
  }

  return data;
}

export const cents = (value: number): number => Math.round(value * 100);

export type AppmaxAddress = {
  postcode: string;
  street: string;
  number: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
};

export type AppmaxProduct = {
  sku: string;
  name: string;
  quantity: number;
  unit_value: number;
  type: "physical" | "digital";
};

export type AppmaxTracking = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export type CreateAppmaxCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentNumber: string;
  ip?: string | null;
  address?: AppmaxAddress;
  products?: AppmaxProduct[];
  tracking?: AppmaxTracking;
};

export async function createAppmaxCustomer(
  input: CreateAppmaxCustomerInput,
): Promise<{ customerId: number }> {
  const data = await apiPost<{ customer: { id: number } }>("/v1/customers", {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone ?? undefined,
    document_number: input.documentNumber,
    ip: input.ip ?? undefined,
    address: input.address,
    products: input.products,
    tracking: input.tracking,
  });

  return { customerId: data.customer.id };
}

export type CreateAppmaxOrderInput = {
  customerId: number;
  productsValueCents: number;
  discountValueCents: number;
  shippingValueCents: number;
  products: AppmaxProduct[];
};

export async function createAppmaxOrder(
  input: CreateAppmaxOrderInput,
): Promise<{ orderId: number }> {
  const data = await apiPost<{ order: { id: number } }>("/v1/orders", {
    customer_id: input.customerId,
    products_value: input.productsValueCents,
    discount_value: input.discountValueCents,
    shipping_value: input.shippingValueCents,
    products: input.products,
  });

  return { orderId: data.order.id };
}

export async function getAppmaxOrder(orderId: number): Promise<{
  status: string;
  payment?: {
    method?: string;
    installments?: number;
    card?: { brand?: string; number?: string };
    paid_at?: string;
  };
}> {
  const data = await apiGet<{ order: { status: string } } & Record<string, unknown>>(`/v1/orders/${orderId}`);
  const order = (data.order ?? data) as {
    status: string;
    payment?: { method?: string; installments?: number; card?: { brand?: string; number?: string }; paid_at?: string };
  };
  return { status: order.status, payment: order.payment };
}

export type AppmaxPaymentResult =
  | { method: "PIX"; pixQrcode: string; pixEmv: string }
  | { method: "BOLETO"; boletoLinkPdf: string; boletoDigitableLine: string }
  | {
      method: "CREDIT_CARD";
      payReference: string;
      status: string;
    };

export async function processAppmaxPayment(
  input: {
    orderId: number;
    customerId: number;
    method: "PIX" | "BOLETO" | "CREDIT_CARD";
    documentNumber: string;
    card?: {
      number: string;
      cvv: string;
      expirationMonth: string;
      expirationYear: string;
      holderName: string;
      installments: number;
      softDescriptor?: string;
    };
  },
): Promise<AppmaxPaymentResult> {
  if (input.method === "PIX") {
    const data = await apiPost<{ payment: { pix_qrcode: string; pix_emv: string } }>("/v1/payments/pix", {
      order_id: input.orderId,
      payment_data: { pix: { document_number: input.documentNumber } },
    });
    return {
      method: "PIX",
      pixQrcode: data.payment.pix_qrcode,
      pixEmv: data.payment.pix_emv,
    };
  }

  if (input.method === "BOLETO") {
    const data = await apiPost<{
      payment: { boleto_link_pdf: string; boleto_digitable_line: string };
    }>("/v1/payments/boleto", {
      order_id: input.orderId,
      payment_data: { boleto: { document_number: input.documentNumber } },
    });
    return {
      method: "BOLETO",
      boletoLinkPdf: data.payment.boleto_link_pdf,
      boletoDigitableLine: data.payment.boleto_digitable_line,
    };
  }

  if (!input.card) {
    throw new Error("Dados do cartão de crédito não informados.");
  }

  const data = await apiPost<{ payment: { pay_reference: string; status: string } }>(
    "/v1/payments/credit-card",
    {
      order_id: input.orderId,
      customer_id: input.customerId,
      payment_data: {
        credit_card: {
          number: input.card.number,
          cvv: input.card.cvv,
          expiration_month: input.card.expirationMonth,
          expiration_year: input.card.expirationYear,
          holder_name: input.card.holderName,
          holder_document_number: input.documentNumber,
          installments: input.card.installments,
          soft_descriptor: input.card.softDescriptor,
        },
      },
    },
  );

  return {
    method: "CREDIT_CARD",
    payReference: data.payment.pay_reference,
    status: data.payment.status,
  };
}

export async function requestAppmaxRefund(orderId: number, valueCents: number): Promise<void> {
  await apiPost("/v1/orders/refund-request", {
    order_id: orderId,
    type: "total",
    value: valueCents,
  });
}
