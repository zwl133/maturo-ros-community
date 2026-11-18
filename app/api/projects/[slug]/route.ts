import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateProject, deleteProject } from "@/lib/services/project-service";
import {
  InputValidationError,
  cleanText,
  cleanTags,
  cleanCost,
  cleanBom,
  cleanSteps,
  cleanAttachments,
  LIMITS,
} from "@/lib/validate";

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

  try {
    // 统一输入校验 + 净化
    const title = cleanText(body.title, "项目标题", LIMITS.title);
    if (!title) throw new InputValidationError("title", "项目标题不能为空");
    const summary = cleanText(body.summary, "项目简介", LIMITS.summary);
    if (!summary) throw new InputValidationError("summary", "项目简介不能为空");
    const category = cleanText(body.category, "分类", LIMITS.category);
    const difficulty = cleanText(body.difficulty, "难度", LIMITS.difficulty);
    if (!category || !difficulty) throw new InputValidationError("category", "请选择分类和难度");

    const result = await updateProject(slug, user.id, {
      title,
      summary,
      description: cleanText(body.description ?? "", "项目介绍", LIMITS.description),
      category,
      difficulty,
      tags: cleanTags(body.tags),
      license: cleanText(body.license ?? "MIT", "许可证", LIMITS.license),
      cover: typeof body.cover === "string" ? body.cover.slice(0, LIMITS.attachmentUrl) : undefined,
      costEstimate: cleanCost(body.costEstimate),
      status: body.status === "draft" ? "draft" : body.status === "published" ? "published" : undefined,
      bom: cleanBom(body.bom),
      steps: cleanSteps(body.steps),
      attachments: cleanAttachments(body.attachments),
    });

    if ("error" in result) {
      const status = result.error === "项目不存在" ? 404 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    if (e instanceof InputValidationError) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    }
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
