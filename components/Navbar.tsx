"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface NavUser {
  id: string;
  email: string;
  handle: string;
  name: string | null;
  avatar: string | null;
  role: string;
}

// 顶部导航栏（客户端组件，通过 /api/auth/me 获取登录态）
export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
            出
          </span>
          <span className="whitespace-nowrap text-lg font-semibold tracking-wide text-ink">出云 ROS 社区</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-secondary">
          <Link href="/" className="hover:text-primary transition-colors">首页</Link>
          <Link href="/explore" className="hover:text-primary transition-colors">项目广场</Link>
          <Link href="/about" className="hover:text-primary transition-colors">关于</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/publish"
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                + 发布项目
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary">
                    {(user.name ?? user.handle).slice(0, 1)}
                  </span>
                  <span className="hidden sm:inline">{user.name ?? user.handle}</span>
                  <svg
                    className={`h-4 w-4 text-ink-tertiary transition-transform ${menuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    <Link
                      href={`/u/${user.handle}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface transition-colors"
                    >
                      <span>👤</span> 我的主页
                    </Link>
                    <Link
                      href="/me/projects"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface transition-colors"
                    >
                      <span>📁</span> 我的项目
                    </Link>
                    <Link
                      href="/me/collections"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface transition-colors"
                    >
                      <span>⭐</span> 我的收藏
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface transition-colors"
                      >
                        <span>🛡️</span> 后台管理
                      </Link>
                    )}
                    <div className="border-t border-border">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-secondary hover:bg-surface hover:text-danger transition-colors"
                      >
                        <span>↪</span> 退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm text-ink-secondary hover:border-primary hover:text-primary transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
