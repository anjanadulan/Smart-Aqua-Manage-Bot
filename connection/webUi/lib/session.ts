import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSettings, hasSessionSecret } from "@/lib/config-store";

export const SESSION_COOKIE = "aqua_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  username: string;
  version: number;
  expiresAt: number;
};

function sign(value: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(username: string, version: number): string | null {
  const payload: SessionPayload = {
    username,
    version,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return signature ? `${encoded}.${signature}` : null;
}

function decodeSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expectedSignature = sign(encoded);
  if (!expectedSignature) return null;

  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (
      typeof parsed.username !== "string" ||
      typeof parsed.version !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) return null;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  if (!hasSessionSecret()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = decodeSessionToken(token);
  if (!payload) return null;

  const settings = await getSettings();
  if (
    !settings ||
    payload.username !== settings.username ||
    payload.version !== settings.sessionVersion
  ) return null;

  return payload;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    priority: "high" as const,
  };
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const expectedHost =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host") ||
      requestUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
    return originUrl.host === expectedHost && originUrl.protocol === expectedProtocol;
  } catch {
    return false;
  }
}
