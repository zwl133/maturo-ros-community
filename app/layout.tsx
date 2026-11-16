import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "出云科技 · 开源硬件项目社区",
    template: "%s · 出云科技",
  },
  description:
    "出云科技是一个面向硬件爱好者与学生的开源硬件项目社区：浏览、筛选、收藏可复刻的开源硬件项目，照着做出来。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
