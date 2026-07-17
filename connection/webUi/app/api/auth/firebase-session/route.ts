import { NextResponse } from "next/server";
import { getSettings, hasSessionSecret } from "@/lib/config-store";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/rate-limit";
import {
  createSessionToken,
  isSameOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

type LookupResponse = {
  users?: Array<{ localId?: string; email?: string }>;
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  }

  const settings = await getSettings();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const operatorUid = process.env.FIREBASE_OPERATOR_UID;
  if (!settings || !hasSessionSecret() || !apiKey || !operatorUid) {
    return NextResponse.json({ error: "Firebase login is not configured on this server." }, { status: 503 });
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

  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken || idToken.length > 4096) {
    return NextResponse.json({ error: "Firebase sign-in was not completed." }, { status: 401 });
  }

  let lookup: Response;
  try {
    lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Firebase could not be reached." }, { status: 502 });
  }

  if (!lookup.ok) {
    return NextResponse.json({ error: "Invalid Firebase credentials." }, { status: 401 });
  }

  const result = (await lookup.json()) as LookupResponse;
  const user = result.users?.[0];
  if (!user?.localId || user.localId !== operatorUid) {
    return NextResponse.json({ error: "This Firebase account is not an Aqua operator." }, { status: 403 });
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
