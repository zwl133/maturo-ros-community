import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-bold">
                出
              </span>
              <span className="font-semibold text-ink">出云科技</span>
            </div>
            <p className="max-w-xs text-sm text-ink-secondary">
              面向硬件爱好者与学生的开源硬件项目社区，浏览、筛选、收藏，照着做出来。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-ink">浏览</span>
              <Link href="/" className="text-ink-secondary hover:text-primary">首页</Link>
              <Link href="/explore" className="text-ink-secondary hover:text-primary">探索项目</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-ink">关于</span>
              <Link href="/about" className="text-ink-secondary hover:text-primary">关于我们</Link>
              <Link href="/about#license" className="text-ink-secondary hover:text-primary">开源协议</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-ink">支持</span>
              <Link href="/about#disclaimer" className="text-ink-secondary hover:text-primary">免责声明</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-ink-tertiary">
          <p>© 2026 出云科技 · 本项目为演示环境，站内项目信息与物料价格为参考，实际以官方渠道为准。</p>
        </div>
      </div>
    </footer>
  );
}
