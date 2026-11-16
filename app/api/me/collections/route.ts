import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

// 获取当前用户的收藏列表
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: {
          author: { select: { handle: true, name: true, avatar: true } },
          _count: { select: { comments: true } },
        },
      },
    },
  });

  const projects = collections.map((c) => ({
    ...c.project,
    tags: JSON.parse(c.project.tags || "[]"),
    likes: c.project.likeCount,
    collects: c.project.collectCount,
    comments: c.project._count.comments,
    // 软删除标记：deletedAt 非空表示原作品已删除
    deleted: !!c.project.deletedAt,
  }));

  return NextResponse.json({ projects });
}
