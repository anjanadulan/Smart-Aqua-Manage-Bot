import { NextResponse } from "next/server";
import { getSettings, hasSessionSecret, verifyPassword } from "@/lib/config-store";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/rate-limit";
import {
  createSessionToken,
  isSameOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  }
  if (process.env.ENABLE_LOCAL_LOGIN !== "true") {
    return NextResponse.json({ error: "Local login is disabled. Use Firebase Authentication." }, { status: 410 });
  }

  const settings = await getSettings();
  if (!settings || !hasSessionSecret()) {
    return NextResponse.json({ error: "Login is not configured on this server." }, { status: 503 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const limit = consumeLoginAttempt(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };
  const valid =
    typeof username === "string" &&
    typeof password === "string" &&
    username.length <= 64 &&
    password.length <= 256 &&
    username === settings.username &&
    verifyPassword(password, settings.passwordHash);

  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = createSessionToken(settings.username, settings.sessionVersion);
  if (!token) {
    return NextResponse.json({ error: "Login is not configured on this server." }, { status: 503 });
  }

  clearLoginAttempts(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
