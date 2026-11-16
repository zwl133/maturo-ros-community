import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

// 后台项目列表（仅管理员）
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { handle: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({
    projects: projects.map((p) => ({
      ...p,
      tags: JSON.parse(p.tags || "[]"),
      likes: p.likeCount,
      collects: p.collectCount,
      comments: p._count.comments,
    })),
  });
}

// 下架/上架项目（仅管理员）
export async function PATCH(req: NextRequest) {
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

  const { id, status } = body;
  if (!id || !["published", "draft"].includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  await prisma.project.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
