import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateProfile, AuthError } from "@/lib/services/auth-service";

// 更新当前用户资料（昵称 / 简介 / 头像）
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  try {
    const updated = await updateProfile(user.id, {
      name: body.name,
      bio: body.bio,
      avatar: body.avatar,
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("更新资料失败:", e);
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}
