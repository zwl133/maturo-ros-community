import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateProject, deleteProject } from "@/lib/services/project-service";

// 编辑项目（仅作者本人）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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
    const result = await updateProject(slug, user.id, {
      title: body.title.trim(),
      summary: body.summary.trim(),
      description: body.description?.trim() ?? "",
      category: body.category,
      difficulty: body.difficulty,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      license: body.license ?? "MIT",
      cover: body.cover,
      costEstimate: body.costEstimate ? Number(body.costEstimate) : 0,
      status: body.status === "draft" ? "draft" : body.status === "published" ? "published" : undefined,
      bom: Array.isArray(body.bom) ? body.bom : [],
      steps: Array.isArray(body.steps) ? body.steps : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    });

    if ("error" in result) {
      const status = result.error === "项目不存在" ? 404 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("编辑项目失败:", e);
    return NextResponse.json({ error: "编辑失败，请稍后重试" }, { status: 500 });
  }
}

// 删除项目（作者本人 或 管理员）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const result = await deleteProject(slug, user.id, user.role === "admin");

    if ("error" in result) {
      const status = result.error === "项目不存在" ? 404 : result.error === "项目已删除" ? 410 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("删除项目失败:", e);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
