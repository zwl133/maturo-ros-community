import { NextRequest, NextResponse } from "next/server";
import { loginUser, AuthError } from "@/lib/services/auth-service";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  try {
    const { token, user } = await loginUser({ email: body.email, password: body.password });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
