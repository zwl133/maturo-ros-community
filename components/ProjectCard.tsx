import Link from "next/link";
import type { SerializedProject } from "@/lib/types";

type Project = SerializedProject;

// 数据统计格式化
export function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// 项目卡片：封面 + 标题 + 作者 + 标签 + 数据
export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/p/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
    >
      {/* 封面 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface">
        {project.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <CoverPlaceholder category={project.category} />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ink-secondary">
          {project.difficulty}
        </span>
      </div>

      {/* 信息 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-primary transition-colors">
          {project.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
          <span className="truncate">{project.author?.name ?? project.author?.handle ?? "匿名"}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-secondary"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-ink-tertiary tabular-nums">
          <Stat icon="view" value={project.views} />
          <Stat icon="like" value={project.likes} />
          <Stat icon="collect" value={project.collects} />
          <Stat icon="comment" value={project.comments} />
        </div>
      </div>
    </Link>
  );
}

function Stat({ icon, value }: { icon: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Icon type={icon} />
      {formatCount(value)}
    </span>
  );
}

function Icon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    view: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />,
    like: (
      <path d="M7 10v10M3 10h4l3-6a2 2 0 0 1 2 2v2h5a1 1 0 0 1 1 1l-1 7a1 1 0 0 1-1 1H7" />
    ),
    collect: <path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.5l1-6L3.3 9.3l6-.9L12 3Z" />,
    comment: (
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" />
    ),
  };
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type] ?? paths.view}
    </svg>
  );
}

function CoverPlaceholder({ category }: { category: string }) {
  const emojiMap: Record<string, string> = {
    开发板: "🧩",
    电源: "🔋",
    机器人: "🤖",
    键盘: "⌨️",
    物联网: "📡",
    仪表: "📊",
    音频: "🎧",
    其他: "🧰",
  };
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-soft to-surface">
      <span className="text-5xl">{emojiMap[category] ?? "🛠️"}</span>
    </div>
  );
}
