"use client";

import { useState } from "react";

// 复制 BOM（TSV 格式）
export function CopyBomButton({ bomText }: { bomText: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bomText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("复制失败，请手动选择表格内容复制");
    }
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-secondary hover:border-primary hover:text-primary transition-colors"
    >
      {copied ? "已复制 ✓" : "复制 BOM 表格"}
    </button>
  );
}
