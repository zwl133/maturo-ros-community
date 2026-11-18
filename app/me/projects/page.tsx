import Link from "next/link";
import { connection } from "next/server";
import SiteLayout from "@/components/SiteLayout";
import { getCurrentUser } from "@/lib/session";
import { getMyProjects } from "@/lib/services/project-service";
import MyProjectsClient from "./MyProjectsClient";

// 数据实时读库 + 读取登录态，走运行时渲染
export const instant = false;

// 我的项目（含草稿，仅本人可见）
export default async function MyProjectsPage() {
  await connection();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <SiteLayout>
        <div className="container-page py-8">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <span className="text-4xl">🔒</span>
            <p className="mt-4 text-ink-secondary">登录后才能查看你的项目</p>
            <Link
              href="/login?redirect=/me/projects"
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
            >
              去登录
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const projects = await getMyProjects(currentUser.id);
  const published = projects.filter((p) => p.status === "published");
  const drafts = projects.filter((p) => p.status !== "published");

  return (
    <SiteLayout>
      <MyProjectsClient published={published} drafts={drafts} />
    </SiteLayout>
  );
}
