"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import type { SerializedProject } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// 「原作品已删除」占位卡片
function DeletedProjectCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-12 text-center">
      <span className="text-3xl opacity-40">🗑️</span>
      <p className="mt-3 text-sm font-medium text-ink-tertiary">原作品已删除</p>
      <p className="mt-1 text-xs text-ink-tertiary/70">作者已删除该作品，收藏记录为你保留</p>
    </div>
  );
}

export default function CollectionsClient() {
  const [collected, setCollected] = useState<SerializedProject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch("/api/me/collections");
      if (res.status === 401) {
        setNeedLogin(true);
        setLoaded(true);
        return;
      }
      const data = await res.json();
      setCollected(data.projects ?? []);
      setLoaded(true);
    };
    load();
  }, []);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-ink">我的收藏</h1>
      <p className="mt-1 text-sm text-ink-secondary">收藏的项目会保存在你的账号中。</p>

      <div className="mt-8">
        {!loaded ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink-tertiary">
            加载中…
          </div>
        ) : needLogin ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <span className="text-4xl">🔒</span>
            <p className="mt-4 text-ink-secondary">登录后才能查看收藏</p>
            <Link
              href="/login?redirect=/me/collections"
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
            >
              去登录
            </Link>
          </div>
        ) : collected.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <span className="text-4xl">⭐</span>
            <p className="mt-4 text-ink-secondary">还没有收藏任何项目</p>
            <Link
              href="/explore"
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
            >
              去浏览项目
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collected.map((p) =>
              p.deleted ? (
                <DeletedProjectCard key={p.id} />
              ) : (
                <ProjectCard key={p.id} project={p} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
