import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createProject } from "@/lib/services/project-service";
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

  try {
    // 统一输入校验 + 净化（长度限制 + HTML 转义）
    const title = cleanText(body.title, "项目标题", LIMITS.title);
    if (!title) throw new InputValidationError("title", "项目标题不能为空");
    const summary = cleanText(body.summary, "项目简介", LIMITS.summary);
    if (!summary) throw new InputValidationError("summary", "项目简介不能为空");
    const category = cleanText(body.category, "分类", LIMITS.category);
    const difficulty = cleanText(body.difficulty, "难度", LIMITS.difficulty);
    if (!category || !difficulty) throw new InputValidationError("category", "请选择分类和难度");

    const project = await createProject({
      userId: user.id,
      title,
      summary,
      description: cleanText(body.description ?? "", "项目介绍", LIMITS.description),
      category,
      difficulty,
      tags: cleanTags(body.tags),
      license: cleanText(body.license ?? "MIT", "许可证", LIMITS.license),
      cover: typeof body.cover === "string" ? body.cover.slice(0, LIMITS.attachmentUrl) : undefined,
      costEstimate: cleanCost(body.costEstimate),
      status: body.status === "draft" ? "draft" : "published",
      bom: cleanBom(body.bom),
      steps: cleanSteps(body.steps),
      attachments: cleanAttachments(body.attachments),
    });
    return NextResponse.json({ ok: true, slug: project.slug }, { status: 201 });
  } catch (e) {
    if (e instanceof InputValidationError) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    }
    console.error("发布项目失败:", e);
    return NextResponse.json({ error: "发布失败，请稍后重试" }, { status: 500 });
  }
}
