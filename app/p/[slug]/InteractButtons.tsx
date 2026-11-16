"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// 收藏/点赞按钮（客户端交互，需登录）
export default function InteractButtons({
  slug,
  initialCollected,
  initialLiked,
  isLoggedIn,
}: {
  slug: string;
  initialCollected: boolean;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [collected, setCollected] = useState(initialCollected);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const interact = async (action: "collect" | "like") => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/p/${slug}`);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${slug}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === "collect") setCollected(data.collected);
        if (action === "like") setLiked(data.liked);
      }
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => interact("collect")}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          collected
            ? "bg-primary text-white"
            : "border border-border text-ink-secondary hover:border-primary hover:text-primary"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={collected ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.5l1-6L3.3 9.3l6-.9L12 3Z" />
        </svg>
        {collected ? "已收藏" : "收藏"}
      </button>
      <button
        onClick={() => interact("like")}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          liked
            ? "bg-primary text-white"
            : "border border-border text-ink-secondary hover:border-primary hover:text-primary"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path d="M7 10v10M3 10h4l3-6a2 2 0 0 1 2 2v2h5a1 1 0 0 1 1 1l-1 7a1 1 0 0 1-1 1H7" />
        </svg>
        {liked ? "已赞" : "点赞"}
      </button>
    </>
  );
}
