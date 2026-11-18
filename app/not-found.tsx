import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";

// 404 页面（渲染在根布局内）
export default function NotFound() {
  return (
    <SiteLayout>
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl font-bold text-primary-soft">404</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">页面未找到</h1>
        <p className="mt-2 max-w-md text-sm text-ink-secondary">
          你访问的内容不存在，可能已被删除或链接有误。
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            返回首页
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-border px-5 py-2 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary"
          >
            浏览项目广场
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
