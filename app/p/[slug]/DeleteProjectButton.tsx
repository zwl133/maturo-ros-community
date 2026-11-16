"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// 删除项目按钮（仅作者/管理员可见，二次确认）
export default function DeleteProjectButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await apiFetch(`/api/projects/${slug}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push(`/login?redirect=/p/${slug}`);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        // 删除成功，跳回项目广场
        router.push("/explore");
        router.refresh();
      } else {
        setError(data.error ?? "删除失败");
        setConfirming(false);
      }
    } catch {
      setError("网络错误，请稍后重试");
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-50 ${
          confirming
            ? "border-danger bg-danger text-white hover:bg-danger/90"
            : "border-border text-ink-tertiary hover:border-danger hover:text-danger"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
        {deleting ? "删除中…" : confirming ? "确认删除？" : "删除"}
      </button>
      {confirming && !deleting && (
        <button
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          className="inline-flex shrink-0 items-center rounded-full border border-border px-3 py-1.5 text-sm text-ink-secondary hover:border-primary hover:text-primary transition-colors"
        >
          取消
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
