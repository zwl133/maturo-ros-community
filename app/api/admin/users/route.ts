import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { adminResetPassword, AuthError } from "@/lib/services/auth-service";

// 获取用户列表（仅管理员，支持按邮箱/昵称搜索）
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { handle: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      handle: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      handle: u.handle,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      projects: u._count.projects,
    })),
  });
}

// 管理员重置用户密码（设定新密码，吊销旧会话）
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { userId, newPassword } = body;
  if (!userId || !newPassword) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  try {
    const result = await adminResetPassword(userId, newPassword);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error("重置密码失败:", e);
    return NextResponse.json({ error: "重置失败，请稍后重试" }, { status: 500 });
  }
}
