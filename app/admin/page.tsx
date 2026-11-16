"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedProject } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SerializedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = async () => {
    const res = await apiFetch("/api/admin/projects");
    if (res.status === 401) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === "published" ? "draft" : "published";
    await apiFetch("/api/admin/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    load();
  };

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-ink-secondary">需要登录才能访问后台</p>
          <Link href="/login?redirect=/admin" className="mt-4 inline-block text-primary hover:text-primary-hover">
            去登录 →
          </Link>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-ink-secondary">你没有管理员权限</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:text-primary-hover">
            返回首页 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
              出
            </span>
            <span className="font-semibold text-ink">项目管理后台</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ink-secondary hover:text-primary">返回前台</Link>
            <button
              onClick={logout}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-ink-secondary hover:border-danger hover:text-danger transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="container-page py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">项目列表</h1>
            <p className="mt-1 text-sm text-ink-secondary">共 {projects.length} 个项目</p>
          </div>
          <Link
            href="/publish"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            + 发布项目
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink-tertiary">加载中…</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs text-ink-secondary">
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">难度</th>
                  <th className="px-4 py-3 font-medium">作者</th>
                  <th className="px-4 py-3 font-medium text-right">收藏</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Link href={`/p/${p.slug}`} className="font-medium text-ink hover:text-primary">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{p.category}</td>
                    <td className="px-4 py-3 text-ink-secondary">{p.difficulty}</td>
                    <td className="px-4 py-3 text-ink-secondary">{p.author?.name ?? p.author?.handle}</td>
                    <td className="px-4 py-3 text-right text-ink-secondary tabular-nums">{p.collects}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"}`}>
                        {p.status === "published" ? "已发布" : "草稿"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        className="text-primary hover:text-primary-hover"
                      >
                        {p.status === "published" ? "下架" : "上架"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
