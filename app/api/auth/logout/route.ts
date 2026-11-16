import { NextResponse } from "next/server";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { logoutSession } from "@/lib/services/auth-service";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await logoutSession(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
