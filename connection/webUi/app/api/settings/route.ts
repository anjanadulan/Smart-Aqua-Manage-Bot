import { NextResponse } from "next/server";
import {
  CLEANING_INTERVAL_MAX,
  CLEANING_INTERVAL_MIN,
  FEED_INTERVAL_MAX,
  FEED_INTERVAL_MIN,
  getSettings,
  updateSettings,
  verifyPassword,
} from "@/lib/config-store";
import { getSession, isSameOrigin, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const feedingIntervalHours = input.feedingIntervalHours;
  const cleaningIntervalDays = input.cleaningIntervalDays;

  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens." },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(feedingIntervalHours) ||
    (feedingIntervalHours as number) < FEED_INTERVAL_MIN ||
    (feedingIntervalHours as number) > FEED_INTERVAL_MAX
  ) {
    return NextResponse.json({ error: "Feeding interval must be a whole number from 1 to 24 hours." }, { status: 400 });
  }
  if (
    !Number.isInteger(cleaningIntervalDays) ||
    (cleaningIntervalDays as number) < CLEANING_INTERVAL_MIN ||
    (cleaningIntervalDays as number) > CLEANING_INTERVAL_MAX
  ) {
    return NextResponse.json({ error: "Cleaning interval must be a whole number from 1 to 30 days." }, { status: 400 });
  }
  if (newPassword && (newPassword.length < 12 || newPassword.length > 128)) {
    return NextResponse.json({ error: "New password must contain 12-128 characters." }, { status: 400 });
  }

  const current = await getSettings();
  if (!current) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  const credentialsChanging = username !== current.username || Boolean(newPassword);
  if (credentialsChanging && !verifyPassword(currentPassword, current.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  const result = await updateSettings({
    username,
    feedingIntervalHours: feedingIntervalHours as number,
    cleaningIntervalDays: cleaningIntervalDays as number,
    newPassword: newPassword || undefined,
  });

  const response = NextResponse.json({
    ok: true,
    reauthenticate: result.credentialsChanged,
    settings: {
      username: result.settings.username,
      feedingIntervalHours: result.settings.feedingIntervalHours,
      cleaningIntervalDays: result.settings.cleaningIntervalDays,
    },
  });
  if (result.credentialsChanged) {
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "strict" });
  }
  return response;
}

