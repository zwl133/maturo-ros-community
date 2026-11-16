import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { toggleCollect, toggleLike, createComment } from "@/lib/services/project-service";

// 收藏/点赞/评论：按 action 分发
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { slug } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { action } = body;
  const projectId = slug; // 这里 slug 实际是项目 slug，需要查项目 id

  // 通过 slug 找项目
  const { prisma } = await import("@/lib/db");
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  try {
    switch (action) {
      case "collect":
        return NextResponse.json(await toggleCollect(user.id, project.id));
      case "like":
        return NextResponse.json(await toggleLike(user.id, project.id));
      case "comment": {
        if (!body.content?.trim()) {
          return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
        }
        const comment = await createComment(user.id, project.id, body.content.trim());
        return NextResponse.json({ ok: true, comment });
      }
      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (e) {
    console.error("操作失败:", e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
