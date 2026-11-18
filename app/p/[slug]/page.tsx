import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLayout from "@/components/SiteLayout";
import ProjectCard from "@/components/ProjectCard";
import CommentSection from "@/components/CommentSection";
import { CopyBomButton } from "@/components/actions";
import { formatCount } from "@/components/ProjectCard";
import {
  getProjectBySlug,
  getProjectsByAuthor,
  listComments,
  listProjects,
} from "@/lib/services/project-service";
import { getCurrentUser } from "@/lib/session";
import InteractButtons from "./InteractButtons";
import DeleteProjectButton from "./DeleteProjectButton";

// 动态路由走运行时渲染（数据依赖 params + cookies）

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "项目未找到" };
  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const author = project.author;
  const authorProjects = (await getProjectsByAuthor(author.handle)).filter((p) => p.id !== project.id);
  const comments = await listComments(project.id);
  const related = (await listProjects({ sort: "hot" }))
    .filter((p) => p.id !== project.id && p.category === project.category)
    .slice(0, 3);

  const currentUser = await getCurrentUser();
  const userInteraction = currentUser
    ? await (await import("@/lib/services/project-service")).getUserInteraction(currentUser.id, project.id)
    : { collected: false, liked: false };

  // BOM 复制文本（TSV）
  const bomItems = project.bom ?? [];
  const bomText = [
    "位号\t型号\t封装\t数量\t单价(元)\t备注",
    ...bomItems.map((b) =>
      [b.designator, b.partNo, b.package ?? "", b.qty, b.unitPrice, b.note ?? ""].join("\t")
    ),
  ].join("\n");

  const licenseBadge: Record<string, string> = {
    MIT: "bg-green-50 text-green-600",
    "Apache-2.0": "bg-blue-50 text-blue-600",
    "GPL-3.0": "bg-orange-50 text-orange-600",
    "CERN-OHL-S": "bg-purple-50 text-purple-600",
    "CC-BY-SA-4.0": "bg-teal-50 text-teal-600",
    "CC-BY-NC-4.0": "bg-pink-50 text-pink-600",
  };

  return (
    <SiteLayout>
      <div className="container-page py-8">
        {/* 面包屑 */}
        <nav className="mb-4 text-xs text-ink-tertiary">
          <Link href="/" className="hover:text-primary">首页</Link>
          <span className="mx-1">/</span>
          <Link href="/explore" className="hover:text-primary">项目广场</Link>
          <span className="mx-1">/</span>
          <Link href={`/explore?category=${project.category}`} className="hover:text-primary">
            {project.category}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-ink-secondary">{project.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 主体 */}
          <article className="lg:col-span-2">
            {/* 封面 */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface">
              {project.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.cover}
                  alt={project.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <CoverPlaceholder category={project.category} />
              )}
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-secondary">
                {project.difficulty}
              </span>
            </div>

            {/* 标题 + 简介 */}
            <div className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-ink sm:text-3xl">{project.title}</h1>
                {currentUser && (currentUser.id === project.authorId || currentUser.role === "admin") && (
                  <div className="flex shrink-0 items-center gap-2">
                    {currentUser.id === project.authorId && (
                      <Link
                        href={`/p/${project.slug}/edit`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        编辑
                      </Link>
                    )}
                    <DeleteProjectButton slug={project.slug} />
                  </div>
                )}
              </div>
              <p className="mt-3 text-base leading-relaxed text-ink-secondary">{project.summary}</p>

              {/* 标签 + 协议 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {project.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/explore?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-surface px-3 py-1 text-xs text-ink-secondary hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
                <span className={`rounded-full px-3 py-1 text-xs ${licenseBadge[project.license] ?? "bg-surface text-ink-secondary"}`}>
                  {project.license}
                </span>
              </div>
            </div>

            {/* 作者栏 + 数据 */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
              <Link href={`/u/${author.handle}`} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                  {(author.name ?? author.handle).slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{author.name ?? author.handle}</div>
                  <div className="text-xs text-ink-tertiary">@{author.handle}</div>
                </div>
              </Link>

              <div className="flex items-center gap-3 text-sm text-ink-tertiary tabular-nums">
                <span>浏览 {formatCount(project.views)}</span>
                <span>收藏 {formatCount(project.collects)}</span>
                <span>评论 {project.comments}</span>
              </div>
            </div>

            {/* 项目介绍 */}
            {project.description && (
              <Section title="项目介绍">
                <p className="text-sm leading-relaxed text-ink-secondary whitespace-pre-line">
                  {project.description}
                </p>
              </Section>
            )}

            {/* BOM */}
            {bomItems.length > 0 && (
              <Section title="物料清单（BOM）" extra={<CopyBomButton bomText={bomText} />}>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface text-left text-xs text-ink-secondary">
                        <th className="px-4 py-2.5 font-medium">位号</th>
                        <th className="px-4 py-2.5 font-medium">型号 / 料号</th>
                        <th className="px-4 py-2.5 font-medium">封装</th>
                        <th className="px-4 py-2.5 font-medium text-right">数量</th>
                        <th className="px-4 py-2.5 font-medium text-right">参考单价</th>
                        <th className="px-4 py-2.5 font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((b, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-ink tabular-nums">{b.designator}</td>
                          <td className="px-4 py-2.5 text-ink">{b.partNo}</td>
                          <td className="px-4 py-2.5 text-ink-secondary">{b.package ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-ink tabular-nums">{b.qty}</td>
                          <td className="px-4 py-2.5 text-right text-ink tabular-nums">¥{b.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-ink-tertiary">{b.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-ink-tertiary">
                  预估物料成本 ¥{project.costEstimate.toFixed(0)}，价格为参考价，实际以采购渠道为准。
                </p>
              </Section>
            )}

            {/* 代码仓库链接 */}
            {(project.attachments?.filter((a) => a.type === "github" || a.type === "gitee").length ?? 0) > 0 && (
              <Section title="代码仓库">
                <div className="flex flex-col gap-2">
                  {project.attachments!
                    .filter((a) => a.type === "github" || a.type === "gitee")
                    .map((a, i) => (
                      <a
                        key={i}
                        href={a.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary hover:bg-primary-soft/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            {a.type === "github" ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                              </svg>
                            ) : (
                              <span className="text-sm font-bold">G</span>
                            )}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-ink">{a.name}</div>
                            <div className="max-w-[420px] truncate text-xs text-ink-tertiary">{a.url}</div>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm text-primary">查看源码 ↗</span>
                      </a>
                    ))}
                </div>
              </Section>
            )}

            {/* 项目图片 */}
            {(project.attachments?.filter((a) => a.type === "image").length ?? 0) > 0 && (
              <Section title="项目图片">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {project.attachments!
                    .filter((a) => a.type === "image")
                    .map((a, i) => (
                      <figure key={i} className="overflow-hidden rounded-xl border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.url ?? ""}
                          alt={a.size ?? a.name}
                          className="aspect-video w-full object-cover"
                        />
                        {a.size && (
                          <figcaption className="px-3 py-2 text-xs text-ink-tertiary">{a.size}</figcaption>
                        )}
                      </figure>
                    ))}
                </div>
              </Section>
            )}

            {/* 演示视频 */}
            {(project.attachments?.filter((a) => a.type === "video").length ?? 0) > 0 && (
              <Section title="演示视频">
                <div className="flex flex-col gap-4">
                  {project.attachments!
                    .filter((a) => a.type === "video")
                    .map((a, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-border">
                        {(() => {
                          const bv = a.url?.match(/BV([0-9A-Za-z]+)/);
                          const yt = a.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
                          if (bv) {
                            return (
                              <iframe
                                src={`https://player.bilibili.com/player.html?bvid=BV${bv[1]}&page=1&high_quality=1`}
                                className="aspect-video w-full"
                                allowFullScreen
                              />
                            );
                          }
                          if (yt) {
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${yt[1]}`}
                                className="aspect-video w-full"
                                allowFullScreen
                              />
                            );
                          }
                          return (
                            <video
                              src={a.url ?? ""}
                              controls
                              className="aspect-video w-full"
                            />
                          );
                        })()}
                        {a.size && (
                          <div className="px-3 py-2 text-xs text-ink-tertiary">{a.size}</div>
                        )}
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* 制作步骤 */}
            {(project.steps?.length ?? 0) > 0 && (
              <Section title="制作步骤">
                <ol className="flex flex-col gap-4">
                  {project.steps!.map((s) => (
                    <li key={s.order} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                        {s.order}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{s.content}</p>
                        {s.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.image}
                            alt={`步骤 ${s.order} 配图`}
                            className="mt-3 max-h-80 w-auto max-w-full rounded-xl border border-border object-contain"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* 版本记录 */}
            {(project.versions?.length ?? 0) > 0 && (
              <Section title="版本记录">
                <ul className="flex flex-col gap-3">
                  {project.versions!.map((v, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-ink-secondary tabular-nums">
                        {v.ver}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs text-ink-tertiary tabular-nums">{v.date}</span>
                        <p className="mt-0.5 text-sm text-ink-secondary">{v.changelog}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 评论 */}
            <div className="mt-10 border-t border-border pt-8">
              <CommentSection
                projectId={project.id}
                slug={project.slug}
                initialComments={comments}
              />
            </div>
          </article>

          {/* 侧栏 */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 flex flex-col gap-4">
              {/* 动作卡片 */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-ink-tertiary text-xs">预估物料成本</div>
                    <div className="mt-1 text-2xl font-bold text-ink tabular-nums">
                      ¥{project.costEstimate.toFixed(0)}
                    </div>
                  </div>
                  <div className="text-xs text-ink-tertiary text-right">
                    <div>参考价</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <InteractButtons
                    slug={project.slug}
                    initialCollected={userInteraction.collected}
                    initialLiked={userInteraction.liked}
                    isLoggedIn={!!currentUser}
                  />
                </div>
              </div>

              {/* 作者信息 */}
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                    {(author.name ?? author.handle).slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">{author.name ?? author.handle}</div>
                    <div className="text-xs text-ink-tertiary">@{author.handle}</div>
                  </div>
                </div>
                {author.bio && <p className="mt-3 text-sm text-ink-secondary">{author.bio}</p>}
                <Link
                  href={`/u/${author.handle}`}
                  className="mt-3 inline-block text-sm text-primary hover:text-primary-hover"
                >
                  查看作者主页 →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* 相关项目 */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-xl font-semibold text-ink">同类项目</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}

function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function CoverPlaceholder({ category }: { category: string }) {
  const emojiMap: Record<string, string> = {
    移动机器人: "🚗", 机械臂: "🦾", 无人机: "🚁", "ROS2 入门": "📚",
    "SLAM 导航": "🗺️", 视觉: "👁️", 仿真: "💻", 其他: "🧰",
  };
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary-soft to-surface">
      <span className="text-7xl">{emojiMap[category] ?? "🤖"}</span>
      <span className="text-sm text-ink-tertiary">项目封面图（占位）</span>
    </div>
  );
}
