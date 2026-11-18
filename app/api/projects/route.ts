import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createProject } from "@/lib/services/project-service";

// 发布项目（需登录）
export async function POST(req: NextRequest) {
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

  // 输入校验
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "项目标题不能为空" }, { status: 400 });
  }
  if (!body.summary || !body.summary.trim()) {
    return NextResponse.json({ error: "项目简介不能为空" }, { status: 400 });
  }
  if (!body.category || !body.difficulty) {
    return NextResponse.json({ error: "请选择分类和难度" }, { status: 400 });
  }

  try {
    const project = await createProject({
      userId: user.id,
      title: body.title.trim(),
      summary: body.summary.trim(),
      description: body.description?.trim() ?? "",
      category: body.category,
      difficulty: body.difficulty,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      license: body.license ?? "MIT",
      cover: body.cover,
      costEstimate: body.costEstimate ? Number(body.costEstimate) : 0,
      status: body.status === "draft" ? "draft" : "published",
      bom: Array.isArray(body.bom) ? body.bom : [],
      steps: Array.isArray(body.steps) ? body.steps : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    });
    return NextResponse.json({ ok: true, slug: project.slug }, { status: 201 });
  } catch (e) {
    console.error("发布项目失败:", e);
    return NextResponse.json({ error: "发布失败，请稍后重试" }, { status: 500 });
  }
}
