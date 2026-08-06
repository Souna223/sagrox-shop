import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

const ADMIN_ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE"];

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function handleError(error: unknown, fallback = "Erro interno do servidor"): NextResponse {
  console.error("[api-error]", error);
  const message = error instanceof Error ? error.message : fallback;
  return fail(message, 500);
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("JSON inválido no corpo da requisição.");
  }
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado.");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!ADMIN_ROLES.includes(user.role)) {
    throw new Error("Acesso restrito a administradores.");
  }
  return user;
}

export async function requireRoles(roles: Role[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Permissão insuficiente.");
  }
  return user;
}

export function isAdminRole(role?: Role): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

type RateLimitEntry = { count: number; resetAt: number };

const rateLimiter = new Map<string, RateLimitEntry>();

export function rateLimit(key: string, limit = 30, windowSeconds = 60): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getGeoFromRequest(request: Request): { country: string | null; state: string | null; city: string | null } {
  const h = (name: string) => request.headers.get(name);
  const country =
    h("x-vercel-ip-country") ?? h("cf-ipcountry") ?? h("cloudfront-viewer-country") ?? h("x-country-code") ?? null;
  const state = h("x-vercel-ip-country-region") ?? h("x-region-code") ?? null;
  const city = h("x-vercel-ip-city") ?? null;
  return { country: country ? country.toUpperCase() : null, state, city };
}
