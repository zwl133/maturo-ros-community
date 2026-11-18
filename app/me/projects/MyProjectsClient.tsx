"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedProject } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// 时间格式化
function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// 单个项目条目（含草稿状态标签 + 操作按钮）
function ProjectRow({
  project,
  isDraft,
  onDeleted,
}: {
  project: SerializedProject;
  isDraft: boolean;
  onDeleted: (slug: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`确定删除「${project.title}」吗？删除后无法恢复。`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/projects/${project.slug}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(project.slug);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "删除失败");
      }
    } catch {
      alert("删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center sm:gap-4">
      {/* 封面缩略图 + 文字（移动端上下，桌面横排） */}
      <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
          {project.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.cover} alt={project.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
              {project.category === "移动机器人" ? "🚗" : project.category === "机械臂" ? "🦾" : project.category === "无人机" ? "🚁" : "🤖"}
            </div>
          )}
          {isDraft && (
            <span className="absolute left-1 top-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              草稿
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{project.title}</span>
          <p className="mt-0.5 truncate text-xs text-ink-secondary">
            {project.category} · {project.difficulty}
            {project.costEstimate > 0 ? ` · ¥${project.costEstimate}` : ""}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-tertiary">
            {isDraft ? "未发布 · " : ""}更新于 {formatDate(project.updatedAt)}
          </p>
        </div>
      </div>

      {/* 操作按钮（移动端换行到下方，桌面在右侧） */}
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        {isDraft ? (
          <Link
            href={`/p/${project.slug}/edit`}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
          >
            继续编辑
          </Link>
        ) : (
          <Link
            href={`/p/${project.slug}`}
            className="rounded-full border border-border px-4 py-1.5 text-xs text-ink-secondary hover:border-primary hover:text-primary transition-colors"
          >
            查看
          </Link>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full px-3 py-1.5 text-xs text-ink-tertiary hover:bg-danger/5 hover:text-danger disabled:opacity-50 transition-colors"
        >
          {deleting ? "删除中…" : "删除"}
        </button>
      </div>
    </div>
  );
}

export default function MyProjectsClient({
  published,
  drafts,
}: {
  published: SerializedProject[];
  drafts: SerializedProject[];
}) {
  const [pubList, setPubList] = useState(published);
  const [draftList, setDraftList] = useState(drafts);

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">我的项目</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            管理你发布的项目和草稿。草稿仅自己可见，完善后可发布。
          </p>
        </div>
        <Link
          href="/publish"
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          + 发布项目
        </Link>
      </div>

      {/* 草稿区 */}
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          草稿
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {draftList.length}
          </span>
        </h2>
        {draftList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <span className="text-3xl opacity-40">📝</span>
            <p className="mt-3 text-sm text-ink-tertiary">暂无草稿</p>
            <p className="mt-1 text-xs text-ink-tertiary/70">发布项目时点「保存草稿」即可存到这里</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {draftList.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                isDraft
                onDeleted={(slug) => setDraftList((list) => list.filter((x) => x.slug !== slug))}
              />
            ))}
          </div>
        )}
      </section>

      {/* 已发布区 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          已发布
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
            {pubList.length}
          </span>
        </h2>
        {pubList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <span className="text-3xl opacity-40">🚀</span>
            <p className="mt-3 text-sm text-ink-tertiary">还没有发布过项目</p>
            <Link
              href="/publish"
              className="mt-3 inline-block rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
            >
              去发布第一个项目
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pubList.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                isDraft={false}
                onDeleted={(slug) => setPubList((list) => list.filter((x) => x.slug !== slug))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
