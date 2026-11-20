"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedProject } from "@/lib/types";
import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  handle: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  projects: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "users">("projects");
  const [projects, setProjects] = useState<SerializedProject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
        {/* Tab 切换 */}
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab("projects")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${tab === "projects" ? "bg-primary text-white" : "border border-border text-ink-secondary hover:border-primary hover:text-primary"}`}>
            项目管理
          </button>
          <button onClick={() => setTab("users")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${tab === "users" ? "bg-primary text-white" : "border border-border text-ink-secondary hover:border-primary hover:text-primary"}`}>
            用户管理
          </button>
        </div>

        {tab === "projects" ? (
          <ProjectsPanel projects={projects} loading={loading} toggleStatus={toggleStatus} />
        ) : (
          <UsersPanel />
        )}
      </div>
    </div>
  );
}

// ===================== 项目管理面板 =====================
function ProjectsPanel({ projects, loading, toggleStatus }: {
  projects: SerializedProject[];
  loading: boolean;
  toggleStatus: (id: string, status: string) => void;
}) {
  return (
    <>
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
    </>
  );
}

// ===================== 用户管理面板 =====================
function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadUsers = async (q = "") => {
    setLoading(true);
    const res = await apiFetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleReset = async (userId: string) => {
    const newPassword = window.prompt("请输入该用户的新密码（至少 6 位）：");
    if (!newPassword) return;
    if (newPassword.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setResettingId(userId);
    setError("");
    setResetDone(null);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetDone(`已重置用户「${data.handle}」的密码，该用户需用新密码重新登录`);
      } else {
        setError(data.error ?? "重置失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">用户管理</h1>
          <p className="mt-1 text-sm text-ink-secondary">共 {users.length} 个用户 · 可重置普通成员密码</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadUsers(search); }}
            placeholder="搜索邮箱 / 昵称…"
            className="h-9 w-56 rounded-lg border border-border px-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none"
          />
          <button onClick={() => loadUsers(search)}
            className="rounded-lg border border-border px-4 text-sm text-ink-secondary hover:border-primary hover:text-primary">
            搜索
          </button>
        </div>
      </div>

      {resetDone && (
        <div className="mb-4 rounded-xl border border-primary-soft bg-primary-soft px-4 py-3 text-sm text-primary-hover">{resetDone}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-ink-tertiary">加载中…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-ink-secondary">
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">昵称</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium text-right">项目数</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 text-ink">{u.email}</td>
                  <td className="px-4 py-3 text-ink">{u.handle}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === "admin" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"}`}>
                      {u.role === "admin" ? "管理员" : "普通用户"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-secondary tabular-nums">{u.projects}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                      {u.status === "active" ? "正常" : "封禁"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleReset(u.id)}
                      disabled={resettingId === u.id}
                      className="text-primary hover:text-primary-hover disabled:opacity-50"
                    >
                      {resettingId === u.id ? "重置中…" : "重置密码"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-tertiary">暂无用户</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
