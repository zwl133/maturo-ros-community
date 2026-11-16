"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ProjectCard from "@/components/ProjectCard";
import type { SerializedProject } from "@/lib/types";

interface Props {
  projects: SerializedProject[];
  categories: string[];
  tags: string[];
  difficulties: readonly string[];
}

export default function ExploreClient({ projects, categories, tags, difficulties }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [input, setInput] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState(searchParams.get("sort") ?? "hot");

  // 搜索防抖（300ms）
  useEffect(() => {
    const t = setTimeout(() => setQ(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  // 同步 URL（可分享）
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    if (sort !== "hot") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [q, category, difficulty, sort, router, pathname]);

  const results = useMemo(() => {
    let r = projects;

    if (q) {
      const query = q.trim().toLowerCase();
      r = r.filter((p) =>
        [p.title, p.summary, p.description, p.tags.join(" ")].join(" ").toLowerCase().includes(query)
      );
    }
    if (category) r = r.filter((p) => p.category === category);
    if (difficulty) r = r.filter((p) => p.difficulty === difficulty);
    if (selectedTags.length > 0) {
      r = r.filter((p) => selectedTags.every((t) => p.tags.includes(t)));
    }

    switch (sort) {
      case "latest":
        r = [...r].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;
      case "most-collected":
        r = [...r].sort((a, b) => b.collectCount - a.collectCount);
        break;
      case "hot":
      default:
        r = [...r].sort((a, b) => (b.collectCount * 2 + b.views * 0.1) - (a.collectCount * 2 + a.views * 0.1));
    }
    return r;
  }, [projects, q, category, difficulty, selectedTags, sort]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  return (
    <div>
      {/* 搜索栏 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索项目名、简介或标签…"
            className="w-full rounded-full border border-border bg-white px-4 py-2.5 pl-10 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink-secondary focus:border-primary focus:outline-none"
        >
          <option value="hot">最热</option>
          <option value="latest">最新</option>
          <option value="most-collected">最多收藏</option>
        </select>
      </div>

      {/* 分类筛选 */}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip active={category === ""} onClick={() => setCategory("")}>
          全部
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </FilterChip>
        ))}
      </div>

      {/* 难度 + 标签 */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-tertiary">难度：</span>
          <FilterChip active={difficulty === ""} onClick={() => setDifficulty("")}>
            全部
          </FilterChip>
          {difficulties.map((d) => (
            <FilterChip
              key={d}
              active={difficulty === d}
              onClick={() => setDifficulty(difficulty === d ? "" : d)}
            >
              {d}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-tertiary">标签：</span>
          {tags.map((t) => (
            <FilterChip
              key={t}
              active={selectedTags.includes(t)}
              onClick={() => toggleTag(t)}
            >
              {t}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 结果 */}
      <div className="mb-4 text-sm text-ink-secondary">
        共 <span className="font-medium text-ink">{results.length}</span> 个项目
        {category && <span className="text-ink-tertiary"> · {category}</span>}
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-4 text-ink-secondary">没有找到匹配的项目</p>
          <p className="mt-1 text-sm text-ink-tertiary">试试调整关键词或筛选条件</p>
          <button
            onClick={() => {
              setInput("");
              setQ("");
              setCategory("");
              setDifficulty("");
              setSelectedTags([]);
            }}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm text-white hover:bg-primary-hover transition-colors"
          >
            清空筛选
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-white text-ink-secondary hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
