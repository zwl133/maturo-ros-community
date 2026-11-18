import { NextRequest, NextResponse } from "next/server";
import { registerUser, AuthError } from "@/lib/services/auth-service";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    handle?: string;
    name?: string;
    captchaId?: string;
    captcha?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!body.email || !body.password || !body.handle) {
    return NextResponse.json({ error: "邮箱、密码、用户名不能为空" }, { status: 400 });
  }

  // 验证码校验（在 bcrypt 慢哈希之前，先拦住无效请求，避免被刷）
  if (!body.captchaId || !body.captcha) {
    return NextResponse.json({ error: "请输入验证码", code: "CAPTCHA_REQUIRED" }, { status: 400 });
  }
  if (!verifyCaptcha(body.captchaId, body.captcha)) {
    return NextResponse.json(
      { error: "验证码错误或已过期，请刷新后重试", code: "CAPTCHA_INVALID" },
      { status: 400 }
    );
  }

  try {
    const user = await registerUser({
      email: body.email,
      password: body.password,
      handle: body.handle,
      name: body.name,
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
