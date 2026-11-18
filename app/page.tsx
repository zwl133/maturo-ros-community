import Link from "next/link";
import { connection } from "next/server";
import SiteLayout from "@/components/SiteLayout";
import ProjectCard from "@/components/ProjectCard";
import { listProjects } from "@/lib/services/project-service";

// 首页展示最新/热门项目，数据实时读库，走运行时渲染

// 机器人社区分类
const categories = [
  { name: "移动机器人", slug: "mobile", icon: "🚗" },
  { name: "机械臂", slug: "arm", icon: "🦾" },
  { name: "无人机", slug: "drone", icon: "🚁" },
  { name: "ROS2 入门", slug: "ros2-basic", icon: "📚" },
  { name: "SLAM 导航", slug: "slam", icon: "🗺️" },
  { name: "视觉", slug: "vision", icon: "👁️" },
  { name: "仿真", slug: "simulation", icon: "💻" },
  { name: "其他", slug: "misc", icon: "🧰" },
];

export default async function Home() {
  await connection();
  const featured = await listProjects({ sort: "hot" });
  const latest = await listProjects({ sort: "latest" });

  const featuredTop = featured.slice(0, 3);
  const latestTop = latest.slice(0, 6);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-white">
        <div className="container-page py-16 text-center">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
            ROS2 机器人开源社区
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-secondary">
            学习、实践、分享、被看见——分享你的机器人项目，展示技术成果，连接开发者与企业。
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              浏览项目
            </Link>
            <Link
              href="/publish"
              className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-medium text-ink hover:border-primary hover:text-primary transition-colors"
            >
              发布项目
            </Link>
          </div>
        </div>
      </section>

      {/* 分类宫格 */}
      <section className="container-page py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">按分类浏览</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.name}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-sm text-ink-secondary">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 精选项目 */}
      <section className="container-page pb-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">热门项目</h2>
          <Link href="/explore?sort=hot" className="text-sm text-primary hover:text-primary-hover">
            查看全部 →
          </Link>
        </div>
        {featuredTop.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTop.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* 最新项目 */}
      <section className="container-page py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">最新发布</h2>
          <Link href="/explore?sort=latest" className="text-sm text-primary hover:text-primary-hover">
            查看全部 →
          </Link>
        </div>
        {latestTop.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestTop.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* 价值主张 */}
      <section className="border-t border-border bg-surface">
        <div className="container-page py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <Feature
              icon="🤖"
              title="真实项目实践"
              desc="从底盘到机械臂，从建图导航到视觉抓取，跟着真实项目动手做。"
            />
            <Feature
              icon="👥"
              title="技术成果展示"
              desc="发布你的项目、代码、调试记录，让技术能力被看见。"
            />
            <Feature
              icon="🤝"
              title="连接企业与机会"
              desc="企业在这里发现真实的技术人才，优秀项目带来更多机会。"
            />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-ink-secondary">{desc}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="text-4xl">🤖</span>
      <p className="mt-4 text-ink-secondary">还没有项目，来发布第一个吧</p>
      <Link
        href="/publish"
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
      >
        发布项目
      </Link>
    </div>
  );
}
