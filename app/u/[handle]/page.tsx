import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLayout from "@/components/SiteLayout";
import ProjectCard from "@/components/ProjectCard";
import { getUserByHandle, getProjectsByAuthor } from "@/lib/services/project-service";
import { getCurrentUser } from "@/lib/session";
import ProfileEditor from "./ProfileEditor";

// 动态路由走运行时渲染

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  return { title: user ? `${user.name ?? user.handle}的主页` : "作者未找到" };
}

export default async function AuthorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) notFound();

  const currentUser = await getCurrentUser();
  const isSelf = currentUser?.handle === handle;

  const projects = await getProjectsByAuthor(handle);
  const totalCollects = projects.reduce((sum, p) => sum + p.collectCount, 0);
  const totalViews = projects.reduce((sum, p) => sum + p.views, 0);

  return (
    <SiteLayout>
      <div className="container-page py-8">
        {/* 作者头部 */}
        <div className="rounded-2xl border border-border bg-gradient-to-b from-primary-soft/50 to-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {(user.name ?? user.handle).slice(0, 1)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-ink">{user.name ?? user.handle}</h1>
              <p className="text-sm text-ink-tertiary">@{user.handle}</p>
            </div>
            {isSelf && <ProfileEditor handle={user.handle} name={user.name ?? user.handle} bio={user.bio ?? null} />}
          </div>
          {user.bio && <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-secondary">{user.bio}</p>}

          <div className="mt-5 flex gap-8 border-t border-border pt-4 text-center">
            <div>
              <div className="text-xl font-bold text-ink tabular-nums">{projects.length}</div>
              <div className="text-xs text-ink-tertiary">项目</div>
            </div>
            <div>
              <div className="text-xl font-bold text-ink tabular-nums">{totalCollects}</div>
              <div className="text-xs text-ink-tertiary">总收藏</div>
            </div>
            <div>
              <div className="text-xl font-bold text-ink tabular-nums">{totalViews}</div>
              <div className="text-xs text-ink-tertiary">总浏览</div>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">发布的项目</h2>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-ink-tertiary">
              还没有发布项目
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
