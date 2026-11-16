import { notFound, redirect } from "next/navigation";
import SiteLayout from "@/components/SiteLayout";
import { getProjectBySlug } from "@/lib/services/project-service";
import { getCurrentUser } from "@/lib/session";
import PublishForm, { type ProjectFormInitial } from "@/app/publish/PublishForm";

// 动态路由走运行时渲染（依赖 params 和 cookie）
export const instant = false;

// 编辑项目页（仅作者本人可访问）
export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?redirect=/p/${slug}/edit`);
  }
  if (currentUser.id !== project.authorId) {
    redirect(`/p/${slug}`);
  }

  // 映射到表单初始数据（附件拆分为仓库链接和图片/视频）
  const attachments = project.attachments ?? [];
  const initial: ProjectFormInitial = {
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    category: project.category,
    difficulty: project.difficulty,
    tags: project.tags,
    license: project.license,
    costEstimate: project.costEstimate,
    cover: project.cover,
    repos: attachments
      .filter((a) => a.type === "github" || a.type === "gitee")
      .map((a) => ({ platform: a.type as "github" | "gitee", url: a.url ?? "" })),
    media: attachments
      .filter((a) => a.type === "image" || a.type === "video")
      .map((a) => ({ type: a.type as "image" | "video", url: a.url ?? "", note: a.size ?? "" })),
    bom: (project.bom ?? []).map((b) => ({
      designator: b.designator,
      partNo: b.partNo,
      package: b.package ?? "",
      qty: b.qty,
      unitPrice: b.unitPrice,
      note: b.note ?? "",
    })),
    steps: (project.steps ?? []).map((s) => ({ order: s.order, title: s.title, content: s.content })),
  };

  return (
    <SiteLayout>
      <PublishForm initial={initial} />
    </SiteLayout>
  );
}
