"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// 评论区：展示 + 新增（真实入库，需登录）
export default function CommentSection({
  projectId,
  slug,
  initialComments,
}: {
  projectId: string;
  slug: string;
  initialComments: CommentItem[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const res = await apiFetch(`/api/projects/${slug}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", content: content.trim() }),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/p/${slug}`);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        // 即时追加新评论到列表顶部，无需刷新
        const newComment = data.comment as CommentItem;
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        setSuccess(true);
        // 3 秒后自动隐藏成功提示
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error ?? "评论失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-ink">
        评论 <span className="text-sm font-normal text-ink-tertiary">({comments.length})</span>
      </h2>

      {/* 输入框 */}
      <div className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          placeholder="分享你的复刻心得、提问或技术交流…"
          className="w-full rounded-xl border border-border bg-white p-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          rows={3}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink-tertiary">
            {content.length}/500
            {error && <span className="ml-2 text-danger">{error}</span>}
            {success && <span className="ml-2 text-green-600">✓ 评论发布成功</span>}
          </span>
          <button
            onClick={submit}
            disabled={!content.trim() || submitting}
            className="rounded-full bg-primary px-5 py-1.5 text-sm text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "发布中…" : "发布评论"}
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-tertiary">
          还没有评论，来抢沙发吧
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-medium text-primary">
                {(c.author.name ?? c.author.handle).slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {c.author.name ?? c.author.handle}
                  </span>
                  <span className="text-xs text-ink-tertiary">
                    {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
