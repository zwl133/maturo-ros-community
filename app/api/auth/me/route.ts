import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// 获取当前登录用户信息（前端判断登录态）
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
  });
}
