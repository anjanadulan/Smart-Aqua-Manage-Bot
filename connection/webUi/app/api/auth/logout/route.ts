import { NextResponse } from "next/server";
import { isSameOrigin, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin was rejected." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "strict" });
  return response;
}

