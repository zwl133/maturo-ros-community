"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/compressImage";
import { parseBomExcel } from "@/lib/parseBomExcel";

const MAX_IMAGES = 15; // 单项目图片上限
const MAX_TAGS = 5; // 标签上限
const MAX_STEPS = 20; // 步骤上限

const CATEGORIES = ["移动机器人", "机械臂", "无人机", "ROS2 入门", "SLAM 导航", "视觉", "仿真", "其他"];
const DIFFICULTIES = ["入门", "进阶", "硬核"];
const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "CERN-OHL-S", "CC-BY-SA-4.0", "CC-BY-NC-4.0"];
const PROJECT_STATUSES = ["教程", "展示", "进行中"];

const TAG_OPTIONS = [
  "ROS2", "SLAM", "导航", "激光雷达", "机械臂", "MoveIt2", "视觉", "YOLO",
  "OpenCV", "PID", "仿真", "Gazebo", "传感器", "嵌入式", "树莓派", "电机", "深度相机",
];

// 内置元器件库（搜索选择用）
interface LibraryPart {
  id: string;
  name: string;
  category: string;
  price: number;
  emoji: string;
  tags: string[];
}

const PARTS_LIBRARY: LibraryPart[] = [
  { id: "leap-ros", name: "LEAP_ROS 两轮智能车套件", category: "套件", price: 699, emoji: "🚗", tags: ["ROS2"] },
  { id: "rplidar-c1", name: "思岚 RPLIDAR C1 激光雷达", category: "传感器", price: 299, emoji: "📡", tags: ["激光雷达", "SLAM"] },
  { id: "rpi4b", name: "树莓派 4B 4GB", category: "主控", price: 389, emoji: "🧠", tags: ["树莓派", "嵌入式"] },
  { id: "rpi5", name: "树莓派 5 8GB", category: "主控", price: 699, emoji: "🧠", tags: ["树莓派", "嵌入式"] },
  { id: "jetson-nano", name: "NVIDIA Jetson Nano", category: "主控", price: 899, emoji: "🧠", tags: ["嵌入式", "视觉"] },
  { id: "jetson-orin", name: "NVIDIA Jetson Orin Nano", category: "主控", price: 1999, emoji: "🧠", tags: ["嵌入式", "视觉"] },
  { id: "m3508", name: "大疆 M3508 无刷电机", category: "电机", price: 349, emoji: "⚙️", tags: ["电机"] },
  { id: "step42", name: "步进电机 42 系列", category: "电机", price: 29, emoji: "⚙️", tags: ["电机"] },
  { id: "mecanum", name: "麦克纳姆轮 ×4", category: "套件", price: 159, emoji: "🛞", tags: ["移动机器人"] },
  { id: "realsense-d435", name: "Intel RealSense D435 深度相机", category: "传感器", price: 1980, emoji: "📷", tags: ["视觉", "深度相机"] },
  { id: "mpu6050", name: "MPU6050 六轴传感器", category: "传感器", price: 9.9, emoji: "🧭", tags: ["传感器", "嵌入式"] },
  { id: "esp32", name: "ESP32 开发板", category: "主控", price: 25, emoji: "🔌", tags: ["嵌入式"] },
  { id: "arduino-mega", name: "Arduino Mega2560", category: "主控", price: 45, emoji: "🔌", tags: ["嵌入式"] },
  { id: "encoder-motor", name: "编码器电机 + 驱动板", category: "电机", price: 89, emoji: "⚙️", tags: ["电机", "PID"] },
  { id: "oled", name: "OLED 显示屏 0.96寸", category: "显示", price: 12, emoji: "🖥️", tags: ["嵌入式"] },
  { id: "lipo-3s", name: "锂电池 3S 11.1V", category: "电源", price: 59, emoji: "🔋", tags: ["电源"] },
  { id: "mg996r", name: "舵机 MG996R", category: "电机", price: 25, emoji: "⚙️", tags: ["电机"] },
  { id: "arm-kit", name: "机械臂套件", category: "套件", price: 899, emoji: "🦾", tags: ["机械臂", "MoveIt2"] },
];

interface BomRow {
  designator: string;
  partNo: string;
  package: string;
  qty: number;
  unitPrice: number;
  note: string;
  libraryId?: string;
  category?: string;
  emoji?: string;
  autoTags?: string[];
}

interface StepRow {
  order: number;
  title: string;
  content: string;
  image?: string;
}

interface RepoRow {
  platform: "github" | "gitee";
  url: string;
}

interface MediaRow {
  type: "image" | "video";
  url: string;
  note: string;
}

export interface ProjectFormInitial {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  license: string;
  costEstimate: number;
  cover: string | null;
  repos: RepoRow[];
  media: MediaRow[];
  bom: BomRow[];
  steps: StepRow[];
}

export default function PublishForm({ initial }: { initial?: ProjectFormInitial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [stage, setStage] = useState<1 | 2>(1);

  // 编辑页字段
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bom, setBom] = useState<BomRow[]>(initial?.bom?.length ? initial.bom : []);
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps?.length ? initial.steps : [{ order: 1, title: "", content: "" }]
  );
  const [repos, setRepos] = useState<RepoRow[]>(
    initial?.repos?.length ? initial.repos : [{ platform: "github", url: "" }]
  );
  const [media, setMedia] = useState<MediaRow[]>(initial?.media ?? []);

  // 发布设置页字段
  const [publicVisible, setPublicVisible] = useState(true);
  const [projectStatus, setProjectStatus] = useState(PROJECT_STATUSES[0]);
  const [allowComment, setAllowComment] = useState(true);
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? DIFFICULTIES[0]);
  const [duration, setDuration] = useState("");
  const [license, setLicense] = useState(initial?.license ?? "MIT");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  // 新建模式下首次自动保存后记录草稿 slug（避免重复 POST 创建）
  const [draftSlug, setDraftSlug] = useState<string | null>(initial?.slug ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [bomSearchOpen, setBomSearchOpen] = useState(false);
  const [bomSearch, setBomSearch] = useState("");
  const [importingBom, setImportingBom] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const bomExcelInputRef = useRef<HTMLInputElement>(null);

  const imageCount = useMemo(
    () => media.filter((m) => m.type === "image" && m.url.trim()).length,
    [media]
  );

  const bomTotal = useMemo(
    () => bom.reduce((sum, b) => sum + (b.unitPrice || 0) * (b.qty || 1), 0),
    [bom]
  );

  const checklist = useMemo(() => {
    const items = [
      { key: "title", label: "标题与简介", why: "一两句话讲清项目", done: !!title.trim() && !!summary.trim() },
      { key: "cover", label: "封面图", why: "成品实拍图，不带文字", done: !!cover.trim() },
      { key: "bom", label: "物料清单（BOM）", why: "至少 1 个元器件，方便他人复刻", done: bom.length > 0 },
      { key: "steps", label: "制作步骤", why: "至少 1 步，带图更佳", done: steps.some((s) => s.title.trim() && s.content.trim()) },
      { key: "video", label: "演示视频", why: "B站 / YouTube 链接即可", done: media.some((m) => m.type === "video" && m.url.trim()) },
      { key: "meta", label: "分类与标签", why: "在「发布设置」中填写", done: tags.length > 0 },
    ];
    const doneCount = items.filter((i) => i.done).length;
    return { items, pct: Math.round((doneCount / items.length) * 100) };
  }, [title, summary, cover, bom, steps, media, tags]);

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const handleCoverUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError("封面仅支持 JPG/PNG/WebP/GIF");
      return;
    }
    setUploadingCover(true);
    setError("");
    try {
      const compressed = await compressImage(file, 100 * 1024); // 封面压到 100KB 以内
      const res = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: compressed.dataUrl, name: file.name }),
      });
      const data = await res.json();
      if (res.ok && data.url) setCover(data.url);
      else setError(`封面上传失败：${data.error ?? "未知错误"}`);
    } catch {
      setError("封面上传失败，请稍后重试");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - imageCount;
    if (remaining <= 0) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    const truncated = picked.length < files.length;

    setUploadingMedia(true);
    setError("");
    const newMedia: MediaRow[] = [];
    try {
      for (const file of picked) {
        if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
          setError(`「${file.name}」不是支持的图片格式`);
          continue;
        }
        const compressed = await compressImage(file, 100 * 1024);
        const res = await apiFetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: compressed.dataUrl, name: file.name }),
        });
        const data = await res.json();
        if (res.ok && data.url) newMedia.push({ type: "image", url: data.url, note: "" });
        else setError(`「${file.name}」上传失败：${data.error ?? "未知错误"}`);
      }
    } catch {
      setError("图片上传失败，请稍后重试");
    } finally {
      setUploadingMedia(false);
    }
    if (newMedia.length > 0) setMedia((prev) => [...prev, ...newMedia]);
    if (truncated) setError(`最多上传 ${MAX_IMAGES} 张图片，已截取前 ${picked.length} 张`);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const handleStepImageUpload = async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError("配图仅支持 JPG/PNG/WebP/GIF");
      return;
    }
    setError("");
    try {
      const compressed = await compressImage(file, 100 * 1024);
      const res = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: compressed.dataUrl, name: file.name }),
      });
      const data = await res.json();
      if (res.ok && data.url) updateStep(idx, "image", data.url);
      else setError(`配图上传失败：${data.error ?? "未知错误"}`);
    } catch {
      setError("配图上传失败，请稍后重试");
    }
  };

  const addBomFromLibrary = (part: LibraryPart) => {
    setBom((prev) => {
      if (prev.some((b) => b.libraryId === part.id)) return prev;
      return [...prev, {
        designator: "", partNo: part.name, package: "", qty: 1, unitPrice: part.price, note: "",
        libraryId: part.id, category: part.category, emoji: part.emoji, autoTags: part.tags,
      }];
    });
    setTags((prev) => {
      const merged = [...prev];
      part.tags.forEach((t) => { if (!merged.includes(t) && merged.length < MAX_TAGS) merged.push(t); });
      return merged;
    });
    setBomSearch("");
    setBomSearchOpen(false);
  };

  const addBomManual = () => {
    setBom((prev) => [...prev, { designator: "", partNo: "", package: "", qty: 1, unitPrice: 0, note: "" }]);
    setBomSearchOpen(false);
    setBomSearch("");
  };

  // 上传 Excel 解析 BOM
  const handleBomExcelUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) && !/spreadsheet|csv|excel/i.test(file.type)) {
      setError("仅支持 .xlsx / .xls / .csv 文件");
      return;
    }
    setImportingBom(true);
    setError("");
    try {
      const rows = await parseBomExcel(file);
      if (rows.length === 0) {
        setError("Excel 中没有解析到有效的物料数据");
        return;
      }
      setBom((prev) => [
        ...prev,
        ...rows.map((r) => ({
          designator: r.designator,
          partNo: r.partNo,
          package: r.package,
          qty: r.qty,
          unitPrice: r.unitPrice,
          note: r.note,
        })),
      ]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel 解析失败，请检查文件格式");
    } finally {
      setImportingBom(false);
      if (bomExcelInputRef.current) bomExcelInputRef.current.value = "";
    }
  };

  const removeBomRow = (idx: number) => setBom((prev) => prev.filter((_, i) => i !== idx));
  const updateBom = (idx: number, field: keyof BomRow, value: string | number) =>
    setBom((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const filteredParts = useMemo(() => {
    const q = bomSearch.trim().toLowerCase();
    if (!q) return PARTS_LIBRARY;
    return PARTS_LIBRARY.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [bomSearch]);

  const addStep = () => {
    setSteps((prev) => {
      if (prev.length >= MAX_STEPS) return prev;
      return [...prev, { order: prev.length + 1, title: "", content: "" }];
    });
  };
  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };
  const updateStep = (idx: number, field: keyof StepRow, value: string) =>
    setSteps((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const addRepo = () => setRepos((prev) => [...prev, { platform: "github", url: "" }]);
  const removeRepo = (idx: number) => setRepos((prev) => prev.filter((_, i) => i !== idx));
  const updateRepo = (idx: number, field: keyof RepoRow, value: string) =>
    setRepos((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value as RepoRow[typeof field] } : row)));

  const addVideo = () => setMedia((prev) => [...prev, { type: "video", url: "", note: "" }]);
  const removeMedia = (idx: number) => setMedia((prev) => prev.filter((_, i) => i !== idx));
  const updateMedia = (idx: number, field: keyof MediaRow, value: string) =>
    setMedia((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value as MediaRow[typeof field] } : row)));

  // ===== 提交 / 草稿 =====
  const buildPayload = (status: "draft" | "published") => {
    const finalTitle = title.trim() || (status === "draft" ? "未命名项目" : "");
    const finalSummary = summary.trim() || (status === "draft" ? "（草稿，待补充简介）" : "");
    const validBom = bom.filter((b) => b.partNo.trim()).map((b) => ({
      designator: b.designator.trim(),
      partNo: b.partNo.trim(),
      package: b.package?.trim() || undefined,
      qty: b.qty || 1,
      unitPrice: b.unitPrice || 0,
      note: b.note?.trim() || undefined,
    }));
    const validSteps = steps
      .filter((s) => s.title.trim() || s.content.trim())
      .map((s, i) => ({ order: i + 1, title: s.title.trim(), content: s.content.trim(), image: s.image || undefined }));
    const attachments = [
      ...repos.filter((r) => r.url.trim()).map((r) => ({
        name: r.platform === "github" ? "GitHub 仓库" : "Gitee 仓库",
        type: r.platform, url: r.url.trim(),
      })),
      ...media.filter((m) => m.url.trim()).map((m) => ({
        name: m.type === "image" ? "项目图片" : "演示视频",
        type: m.type, url: m.url.trim(), size: m.note.trim() || undefined,
      })),
    ];

    return {
      title: finalTitle,
      summary: finalSummary,
      description: description.trim(),
      category, difficulty, tags, license,
      cover: cover.trim() || undefined,
      costEstimate: bom.length > 0 ? bomTotal : 0,
      bom: validBom, steps: validSteps, attachments,
      status,
    };
  };

  const submit = async (status: "draft" | "published") => {
    if (status === "published") {
      if (!title.trim()) { setError("请填写项目标题"); setStage(1); return; }
      if (!summary.trim()) { setError("请填写项目简介"); setStage(1); return; }
    }
    if (status === "draft") setDrafting(true);
    else setLoading(true);
    setError("");
    setDraftSaved(false);

    const payload = buildPayload(status);
    try {
      // 编辑模式走 PATCH；新建模式若已通过自动保存创建过草稿，也走 PATCH 更新（避免重复创建）
      const targetSlug = isEdit ? initial!.slug : draftSlug;
      const url = targetSlug ? `/api/projects/${targetSlug}` : "/api/projects";
      const method = targetSlug ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login?redirect=/publish");
        return;
      }
      if (res.ok) {
        if (status === "draft") {
          setDraftSaved(true);
          // 新建草稿后，跳转到编辑页（带着 slug），便于继续编辑
          if (!isEdit) {
            router.push(`/p/${data.slug}/edit`);
          }
        } else {
          router.push(`/p/${data.slug}`);
          router.refresh();
        }
      } else {
        setError(data.error ?? (isEdit ? "保存失败" : "发布失败"));
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setDrafting(false);
      setLoading(false);
    }
  };

  // ===== 草稿自动保存（编辑模式 + 新建模式：内容变化后延迟 3 秒静默保存）=====
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstAutoSave = useRef(true);

  // 新建模式下是否有实际内容（用于判断是否值得触发自动保存，避免空表单就创建草稿）
  const hasContent = useMemo(
    () =>
      title.trim() !== "" ||
      summary.trim() !== "" ||
      description.trim() !== "" ||
      bom.some((b) => b.partNo.trim() !== "" || b.designator.trim() !== "") ||
      steps.some((s) => s.title.trim() !== "" || s.content.trim() !== ""),
    [title, summary, description, bom, steps]
  );

  // 静默保存草稿（不跳转、不弹提示，仅更新"已自动保存"时间）
  const autosaveDraft = useCallback(async () => {
    setAutosaving(true);
    const payload = buildPayload("draft");
    try {
      if (isEdit && initial) {
        // 编辑已有项目：一直用 PATCH 更新
        const res = await apiFetch(`/api/projects/${initial.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setLastAutoSaved(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
        }
      } else if (draftSlug) {
        // 新建模式 + 已创建过草稿：用 PATCH 更新这个草稿
        const res = await apiFetch(`/api/projects/${draftSlug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setLastAutoSaved(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
        }
      } else {
        // 新建模式 + 首次自动保存：POST 创建草稿，记录 slug（后续转 PATCH，避免重复创建）
        const res = await apiFetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.slug) {
          setDraftSlug(data.slug);
          setLastAutoSaved(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
        }
      }
      // 401/其他错误静默忽略，不打断用户输入
    } catch {
      // 网络失败静默忽略
    } finally {
      setAutosaving(false);
    }
  }, [isEdit, initial, draftSlug, title, summary, description, category, difficulty, tags, license, cover, bom, steps, repos, media, bomTotal]);

  useEffect(() => {
    // 跳过首次挂载（避免刚进页面就触发一次保存）
    if (skipFirstAutoSave.current) {
      skipFirstAutoSave.current = false;
      return;
    }
    // 新建模式下没有实际内容时不触发（避免空表单就创建草稿）
    if (!isEdit && !hasContent) return;
    // 清除上一个定时器，防抖 3 秒
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      autosaveDraft();
    }, 3000);
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    };
  }, [isEdit, hasContent, title, summary, description, category, difficulty, tags, license, cover, bom, steps, repos, media, autosaveDraft]);

  const preflight = useMemo(() => {
    const items = [
      { label: "标题与简介", ok: !!title.trim() && !!summary.trim(), detail: title.trim() && summary.trim() ? "已填写" : "未填写" },
      { label: "物料清单", ok: bom.length > 0, detail: bom.length > 0 ? `${bom.length} 个元器件 · 合计 ¥${bomTotal}` : "未添加" },
      { label: "制作步骤", ok: steps.some((s) => s.title.trim()), detail: steps.some((s) => s.title.trim()) ? `${steps.filter((s) => s.title.trim()).length} 步` : "未添加" },
      { label: "封面图", ok: !!cover.trim(), detail: cover.trim() ? "已上传" : "未上传" },
      { label: "演示视频", ok: media.some((m) => m.type === "video" && m.url.trim()), detail: media.some((m) => m.type === "video") ? "已添加" : "未添加" },
    ];
    return { items, missingCount: items.filter((i) => !i.ok).length };
  }, [title, summary, bom, bomTotal, steps, cover, media]);

  return (
    <div className="container-page">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 sm:px-6">
          <StageTabs stage={stage} onChange={setStage} />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-ink-tertiary sm:inline-flex sm:items-center sm:gap-1">
              {autosaving ? (
                <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />自动保存中…</>
              ) : lastAutoSaved ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-green-500" />已自动保存 {lastAutoSaved}</>
              ) : (
                <span className="text-ink-tertiary">{isEdit ? "编辑内容将自动保存为草稿" : "内容将自动保存为草稿"}</span>
              )}
            </span>
            <button
              onClick={() => { if (isEdit) router.push(`/p/${initial!.slug}`); else setError("请先保存后再预览"); }}
              className="hidden rounded-lg px-3 py-2 text-sm text-ink-secondary hover:bg-surface hover:text-primary sm:block"
            >
              预览项目页
            </button>
            <button
              onClick={() => submit("draft")}
              disabled={drafting || loading}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-secondary hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {drafting ? "保存中…" : "保存草稿"}
            </button>
            {stage === 1 ? (
              <button
                onClick={() => setStage(2)}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                下一步：发布设置
              </button>
            ) : (
              <button
                onClick={() => setStage(1)}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                ← 返回编辑
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 草稿保存成功提示 */}
      {draftSaved && (
        <div className="mx-auto max-w-[1200px] px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-primary-soft bg-primary-soft px-4 py-3 text-sm text-primary-hover">
            ✓ 草稿已保存，仅自己可见。可继续编辑或前往「发布设置」发布。
          </div>
        </div>
      )}

      {stage === 1 ? (
        <EditStage
          cover={cover} setCover={setCover} uploadingCover={uploadingCover} onCoverUpload={handleCoverUpload} coverInputRef={coverInputRef}
          title={title} setTitle={setTitle} summary={summary} setSummary={setSummary}
          description={description} setDescription={setDescription}
          bom={bom} bomTotal={bomTotal} bomSearchOpen={bomSearchOpen} setBomSearchOpen={setBomSearchOpen}
          bomSearch={bomSearch} setBomSearch={setBomSearch} filteredParts={filteredParts}
          addBomFromLibrary={addBomFromLibrary} addBomManual={addBomManual} updateBom={updateBom} removeBomRow={removeBomRow}
          importingBom={importingBom} onBomExcelUpload={handleBomExcelUpload} bomExcelInputRef={bomExcelInputRef}
          steps={steps} addStep={addStep} removeStep={removeStep} moveStep={moveStep} updateStep={updateStep} onStepImageUpload={handleStepImageUpload}
          media={media} imageCount={imageCount} uploadingMedia={uploadingMedia} onMediaUpload={handleMediaUpload} mediaInputRef={mediaInputRef}
          addVideo={addVideo} removeMedia={removeMedia} updateMedia={updateMedia}
          repos={repos} addRepo={addRepo} removeRepo={removeRepo} updateRepo={updateRepo}
          checklist={checklist} category={category} difficulty={difficulty} license={license} tags={tags}
        />
      ) : (
        <PublishStage
          publicVisible={publicVisible} setPublicVisible={setPublicVisible}
          projectStatus={projectStatus} setProjectStatus={setProjectStatus}
          allowComment={allowComment} setAllowComment={setAllowComment}
          category={category} setCategory={setCategory} difficulty={difficulty} setDifficulty={setDifficulty}
          duration={duration} setDuration={setDuration} license={license} setLicense={setLicense}
          tags={tags} toggleTag={toggleTag} preflight={preflight}
          error={error} loading={loading} onSubmit={() => submit("published")} onBack={() => setStage(1)}
        />
      )}

      {stage === 1 && error && (
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}

// ===================== 顶栏页签 =====================
function StageTabs({ stage, onChange }: { stage: 1 | 2; onChange: (s: 1 | 2) => void }) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      <button onClick={() => onChange(1)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors sm:px-4 ${
          stage === 1 ? "bg-white font-semibold text-primary shadow-sm" : "text-ink-secondary hover:text-primary"
        }`}>
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          stage === 1 ? "bg-primary text-white" : "bg-primary-soft text-primary"
        }`}>1</span>
        编辑项目
      </button>
      <button onClick={() => onChange(2)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors sm:px-4 ${
          stage === 2 ? "bg-white font-semibold text-primary shadow-sm" : "text-ink-secondary hover:text-primary"
        }`}>
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          stage === 2 ? "bg-primary text-white" : "bg-primary-soft text-primary"
        }`}>2</span>
        发布设置
      </button>
    </div>
  );
}

// ===================== 视图①：编辑项目 =====================
interface EditStageProps {
  cover: string; setCover: (v: string) => void; uploadingCover: boolean; onCoverUpload: (f: FileList | null) => void; coverInputRef: React.RefObject<HTMLInputElement | null>;
  title: string; setTitle: (v: string) => void; summary: string; setSummary: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  bom: BomRow[]; bomTotal: number; bomSearchOpen: boolean; setBomSearchOpen: (v: boolean) => void;
  bomSearch: string; setBomSearch: (v: string) => void; filteredParts: LibraryPart[];
  addBomFromLibrary: (p: LibraryPart) => void; addBomManual: () => void; updateBom: (idx: number, f: keyof BomRow, v: string | number) => void; removeBomRow: (idx: number) => void;
  importingBom: boolean; onBomExcelUpload: (f: FileList | null) => void; bomExcelInputRef: React.RefObject<HTMLInputElement | null>;
  steps: StepRow[]; addStep: () => void; removeStep: (idx: number) => void; moveStep: (idx: number, d: -1 | 1) => void; updateStep: (idx: number, f: keyof StepRow, v: string) => void; onStepImageUpload: (idx: number, f: FileList | null) => void;
  media: MediaRow[]; imageCount: number; uploadingMedia: boolean; onMediaUpload: (f: FileList | null) => void; mediaInputRef: React.RefObject<HTMLInputElement | null>;
  addVideo: () => void; removeMedia: (idx: number) => void; updateMedia: (idx: number, f: keyof MediaRow, v: string) => void;
  repos: RepoRow[]; addRepo: () => void; removeRepo: (idx: number) => void; updateRepo: (idx: number, f: keyof RepoRow, v: string) => void;
  checklist: { items: { key: string; label: string; why: string; done: boolean }[]; pct: number };
  category: string; difficulty: string; license: string; tags: string[];
}

function EditStage(props: EditStageProps) {
  const {
    cover, setCover, uploadingCover, onCoverUpload, coverInputRef,
    title, setTitle, summary, setSummary, description, setDescription,
    bom, bomTotal, bomSearchOpen, setBomSearchOpen, bomSearch, setBomSearch,
    filteredParts, addBomFromLibrary, addBomManual, updateBom, removeBomRow,
    importingBom, onBomExcelUpload, bomExcelInputRef,
    steps, addStep, removeStep, moveStep, updateStep, onStepImageUpload,
    media, imageCount, uploadingMedia, onMediaUpload, mediaInputRef, addVideo, removeMedia, updateMedia,
    repos, addRepo, removeRepo, updateRepo,
    checklist, category, difficulty, license, tags,
  } = props;

  return (
    <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1fr_312px] md:items-start">
      <div className="flex flex-col gap-4">
        {/* 封面图 */}
        <Block label="封面图" must="必填 · 展示在广场卡片第一位">
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => onCoverUpload(e.target.files)} className="hidden" />
          {cover ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="封面预览" className="aspect-[16/7] w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              <button type="button" onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white hover:bg-black/70">
                {uploadingCover ? "上传中…" : "更换封面"}
              </button>
              <button type="button" onClick={() => setCover("")}
                className="absolute left-2 top-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => coverInputRef.current?.click()}
              className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border-strong bg-white text-ink-tertiary transition-colors hover:border-primary hover:text-primary">
              <span className="text-2xl">{uploadingCover ? "⏳" : "🖼️"}</span>
              <span className="text-sm font-semibold">{uploadingCover ? "上传中…" : "点击或拖拽上传封面"}</span>
              <span className="text-xs">建议 16:9 成品实拍图 · 高分辨率 · 不要带文字</span>
            </button>
          )}
        </Block>

        {/* 标题与简介 */}
        <Block label="项目标题与简介" must="必填">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="给项目起个名字，如「基于 LEAP_ROS 的自主巡线小车」"
            className="w-full border-b-2 border-transparent bg-transparent px-0 py-1.5 text-xl font-bold text-ink placeholder:text-border-strong focus:border-primary focus:outline-none" />
          <div className="mt-1 text-right text-xs text-ink-tertiary">{title.length} / 30</div>
          <div className="mt-3">
            <div className="mb-2 text-sm text-ink-secondary">项目简介 <span className="text-xs text-ink-tertiary">将展示在广场项目卡片上</span></div>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="50 字左右，突出亮点与创新点，不要重复标题" rows={2} className={inputCls} />
            <div className="mt-1 text-right text-xs text-ink-tertiary">{summary.length} / 120</div>
          </div>
        </Block>

        {/* 详细介绍 */}
        <Block label="项目详情" must="必填 · 支持 Markdown / 图片 / 代码块 / B站视频嵌入">
          <p className="mb-3 text-xs text-ink-tertiary">建议包含：项目背景 → 系统架构 → 硬件与软件方案 → 遇到的坑</p>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={"## 背景\n为什么做这个项目、想解决什么问题……\n\n## 系统架构\n上位机 / 下位机分工、通信方式……"}
            rows={8} className={inputCls} />
        </Block>

        {/* BOM */}
        <Block label="物料清单（BOM）" must="选库内元器件自动关联标签">
          {bom.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {bom.map((row, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-base">{row.emoji || "🔩"}</span>
                  <div className="min-w-0 flex-1">
                    {row.libraryId ? (
                      <>
                        <div className="truncate text-sm font-semibold text-ink">{row.partNo}</div>
                        <div className="truncate text-xs text-ink-tertiary">
                          {row.category || "元器件"} · ¥{row.unitPrice}
                          {row.autoTags && row.autoTags.length > 0 && (
                            <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">自动关联「{row.autoTags.join("、")}」标签</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <input value={row.partNo} onChange={(e) => updateBom(idx, "partNo", e.target.value)}
                          placeholder="元器件名称" className="h-8 min-w-0 flex-1 rounded-lg border border-border px-2 text-sm text-ink focus:border-primary focus:outline-none" />
                        <input type="number" value={row.unitPrice || ""} onChange={(e) => updateBom(idx, "unitPrice", Number(e.target.value))}
                          placeholder="单价" className="h-8 w-20 rounded-lg border border-border px-2 text-sm text-ink focus:border-primary focus:outline-none" />
                        <input type="number" value={row.qty || 1} onChange={(e) => updateBom(idx, "qty", Number(e.target.value))}
                          placeholder="数量" className="h-8 w-16 rounded-lg border border-border px-2 text-sm text-ink focus:border-primary focus:outline-none" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeBomRow(idx)} className="shrink-0 text-sm text-ink-tertiary hover:text-danger">✕</button>
                </div>
              ))}
            </div>
          )}

          {bomSearchOpen ? (
            <div className="rounded-xl border border-border">
              <input autoFocus value={bomSearch} onChange={(e) => setBomSearch(e.target.value)}
                placeholder="搜索元器件名称或分类…"
                className="w-full rounded-t-xl border-b border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none" />
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredParts.map((p) => (
                  <button key={p.id} onClick={() => addBomFromLibrary(p)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-base">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">{p.name}</div>
                      <div className="text-xs text-ink-tertiary">{p.category} · ¥{p.price}</div>
                    </div>
                    <span className="shrink-0 text-xs text-primary">+ 添加</span>
                  </button>
                ))}
                {filteredParts.length === 0 && <div className="px-2 py-4 text-center text-sm text-ink-tertiary">未找到，可新建条目</div>}
              </div>
              <div className="flex gap-2 border-t border-border p-2">
                <button onClick={addBomManual} className="flex-1 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary-soft">+ 新建自定义元器件（手填）</button>
                <button onClick={() => bomExcelInputRef.current?.click()} className="flex-1 rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary-soft">📄 上传 Excel 解析 BOM</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => setBomSearchOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 py-3 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary">
                🔍 搜索元器件添加…（可新建条目 · 自动汇总预估成本）
              </button>
              <button onClick={() => bomExcelInputRef.current?.click()} disabled={importingBom}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 py-3 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
                {importingBom ? "解析中…" : "📄 上传 Excel 一键导入 BOM（支持 .xlsx / .xls / .csv）"}
              </button>
            </div>
          )}

          <input ref={bomExcelInputRef} type="file" accept=".xlsx,.xls,.csv"
            onChange={(e) => onBomExcelUpload(e.target.files)} className="hidden" />

          {bom.length > 0 && (
            <div className="mt-2 text-right text-xs text-ink-tertiary">
              预估物料成本合计：<span className="font-semibold text-primary">¥ {bomTotal}</span>
            </div>
          )}
        </Block>

        {/* 制作步骤 */}
        <Block label="制作步骤" must="可选 · 可上下移动排序 · 引导他人复刻">
          <div className="flex flex-col gap-3">
            {steps.map((row, idx) => (
              <div key={idx} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2 bg-surface px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{idx + 1}</span>
                  <input value={row.title} onChange={(e) => updateStep(idx, "title", e.target.value)}
                    placeholder="步骤标题，例如：组装底盘并校准"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-tertiary focus:outline-none" />
                  <div className="ml-auto flex shrink-0 items-center gap-1 text-ink-tertiary">
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="rounded px-1.5 hover:text-primary disabled:opacity-30">↑</button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="rounded px-1.5 hover:text-primary disabled:opacity-30">↓</button>
                    <button onClick={() => removeStep(idx)} className="rounded px-1.5 text-xs text-ink-tertiary hover:text-danger">删除</button>
                  </div>
                </div>
                <div className="p-3">
                  <textarea value={row.content} onChange={(e) => updateStep(idx, "content", e.target.value)}
                    placeholder="描述这一步怎么做，配合图片说明" rows={2} className={inputCls} />
                  {row.image ? (
                    <div className="mt-2 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.image} alt={`步骤 ${idx + 1} 配图`} className="h-20 w-auto rounded-lg border border-border object-cover" />
                      <button onClick={() => updateStep(idx, "image", "")} className="ml-2 align-top text-xs text-danger hover:underline">移除配图</button>
                    </div>
                  ) : (
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                      ＋ 添加配图
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                        onChange={(e) => { onStepImageUpload(idx, e.target.files); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={addStep} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 py-3 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary">＋ 添加步骤</button>
        </Block>

        {/* 图片 / 视频 */}
        <Block label="项目图片 / 演示视频" must="可选 · 图片最多 15 张 · 视频支持 B站 / YouTube 链接">
          <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
            onChange={(e) => onMediaUpload(e.target.files)} className="hidden" />
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {media.map((m, idx) => (
              <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                {m.type === "image" && m.url.trim() ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.url} alt={`图片 ${idx + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary-soft">
                    <span className="text-lg">{m.type === "video" ? "▶" : "📷"}</span>
                    {m.type === "video" && m.url.trim() && <span className="rounded bg-black/60 px-1.5 text-[10px] text-white">视频</span>}
                  </div>
                )}
                <button onClick={() => removeMedia(idx)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[10px] text-white hover:bg-black/70">✕</button>
              </div>
            ))}

            {imageCount < MAX_IMAGES && (
              <button onClick={() => mediaInputRef.current?.click()} disabled={uploadingMedia}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong text-ink-tertiary transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
                <span className="text-lg">{uploadingMedia ? "⏳" : "＋"}</span>
                <span className="text-[10px]">上传图片</span>
              </button>
            )}
            <button onClick={addVideo}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong text-ink-tertiary transition-colors hover:border-primary hover:text-primary">
              <span className="text-lg">▶</span>
              <span className="text-[10px]">添加视频</span>
            </button>
          </div>

          {media.some((m) => m.type === "video") && (
            <div className="mt-3 flex flex-col gap-2">
              {media.map((m, idx) => m.type === "video" ? (
                <div key={idx} className="flex items-center gap-2">
                  <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-semibold text-ink-secondary">视频</span>
                  <input type="url" value={m.url} onChange={(e) => updateMedia(idx, "url", e.target.value)}
                    placeholder="https://www.bilibili.com/video/BV... 或 YouTube 链接"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
                  <button onClick={() => removeMedia(idx)} className="shrink-0 text-sm text-ink-tertiary hover:text-danger">✕</button>
                </div>
              ) : null)}
            </div>
          )}

          <div className="mt-2 text-left text-xs text-ink-tertiary">
            已传 {imageCount} 张图 + {media.filter((m) => m.type === "video" && m.url.trim()).length} 个视频 · {imageCount} / {MAX_IMAGES} · 本地上传自动压缩至 100KB
          </div>
        </Block>

        {/* 代码仓库 */}
        <Block label="代码仓库" must="可选 · 方便他人查看源码与复刻">
          <div className="flex flex-col gap-2">
            {repos.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2">
                <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${row.platform === "github" ? "bg-surface text-ink-secondary" : "bg-orange-50 text-orange-700"}`}>
                  {row.platform === "github" ? "GitHub" : "Gitee"}
                </span>
                <select value={row.platform} onChange={(e) => updateRepo(idx, "platform", e.target.value)}
                  className="h-8 shrink-0 rounded-md border border-border bg-white px-1 text-xs text-ink focus:outline-none">
                  <option value="github">GitHub</option>
                  <option value="gitee">Gitee</option>
                </select>
                <input type="url" value={row.url} onChange={(e) => updateRepo(idx, "url", e.target.value)}
                  placeholder="github.com/you/repo"
                  className="h-8 min-w-0 flex-1 rounded-md border border-border px-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
                <button onClick={() => removeRepo(idx)} className="shrink-0 text-sm text-ink-tertiary hover:text-danger">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addRepo} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 py-2.5 text-sm text-ink-secondary transition-colors hover:border-primary hover:text-primary">＋ 添加仓库链接（支持 GitHub / Gitee）</button>
        </Block>
      </div>

      {/* 右栏 */}
      <aside className="flex flex-col gap-4 md:sticky md:top-20">
        <SideCard>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">📋 项目质量清单</h3>
          <p className="mb-3 mt-0.5 text-xs text-ink-tertiary">补齐以下内容，项目更容易被推荐到广场首页</p>
          <div className="mb-3 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all" style={{ width: `${checklist.pct}%` }} />
            </div>
            <span className="text-xs font-bold text-primary">{checklist.pct}%</span>
          </div>
          {checklist.items.map((item) => (
            <div key={item.key} className={`flex items-start gap-2.5 border-b border-dashed border-border py-2 last:border-b-0 ${item.done ? "opacity-70" : ""}`}>
              <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] ${item.done ? "bg-green-500 text-white" : "border border-dashed border-border-strong text-transparent"}`}>✓</span>
              <div className="text-[13px]">
                <span className={item.done ? "text-ink-tertiary line-through" : "text-ink"}>{item.label}</span>
                <span className="block text-[11px] text-ink-tertiary">{item.why}</span>
              </div>
            </div>
          ))}
        </SideCard>

        <SideCard>
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            可见性
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />草稿 · 仅自己可见
            </span>
          </h3>
          <div className="mt-2">
            <MetaRow k="分类" required v={category} />
            <MetaRow k="难度" required v={difficulty} />
            <MetaRow k="开源协议" required v={license} />
            <MetaRow k="预估物料成本" v={bom.length > 0 ? `¥ ${bomTotal}` : "—"} hint={bom.length > 0 ? "由 BOM 自动汇总" : undefined} />
            <MetaRow k="标签" v={tags.length > 0 ? `${tags.length} 个` : "—"} />
          </div>
        </SideCard>

        <div className="rounded-2xl border border-primary-soft bg-primary-soft p-4">
          <h4 className="text-[13px] font-bold text-primary-hover">💡 发布小贴士</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">封面清晰、简介突出亮点、附上仓库链接和完整制作步骤的项目，更容易被推荐到广场首页并获得「精选」标识。</p>
        </div>
      </aside>
    </div>
  );
}

// ===================== 视图②：发布设置 =====================
interface PublishStageProps {
  publicVisible: boolean; setPublicVisible: (v: boolean) => void;
  projectStatus: string; setProjectStatus: (v: string) => void;
  allowComment: boolean; setAllowComment: (v: boolean) => void;
  category: string; setCategory: (v: string) => void; difficulty: string; setDifficulty: (v: string) => void;
  duration: string; setDuration: (v: string) => void; license: string; setLicense: (v: string) => void;
  tags: string[]; toggleTag: (t: string) => void;
  preflight: { items: { label: string; ok: boolean; detail: string }[]; missingCount: number };
  error: string; loading: boolean; onSubmit: () => void; onBack: () => void;
}

function PublishStage(props: PublishStageProps) {
  const {
    publicVisible, setPublicVisible, projectStatus, setProjectStatus, allowComment, setAllowComment,
    category, setCategory, difficulty, setDifficulty, duration, setDuration, license, setLicense,
    tags, toggleTag, preflight, error, loading, onSubmit, onBack,
  } = props;

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-ink">发布设置</h1>
        <p className="mt-1 text-sm text-ink-secondary">确认以下信息后，项目将出现在广场并可供搜索</p>
      </div>

      <PubSection title="可见性与状态">
        <ToggleRow label="公开可见（Discoverable）" desc="开启后项目出现在广场首页、搜索结果与你的主页" on={publicVisible} onToggle={() => setPublicVisible(!publicVisible)} />
        <div className="flex items-center justify-between border-b border-dashed border-border py-3 last:border-b-0">
          <div>
            <div className="text-[13px] font-semibold text-ink">项目状态</div>
            <div className="text-xs text-ink-tertiary">教程（含复刻步骤）/ 展示（仅展示成果）/ 进行中</div>
          </div>
          <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}
            className="min-w-[90px] rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none">
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ToggleRow label="允许评论" desc="其他用户可在项目页留言交流" on={allowComment} onToggle={() => setAllowComment(!allowComment)} />
      </PubSection>

      <PubSection title="分类与属性">
        <div className="mb-2 text-[13px] font-semibold text-ink">分类 <span className="text-danger">*</span></div>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${category === c ? "border-primary bg-primary text-white" : "border-border bg-white text-ink-secondary hover:border-primary hover:text-primary"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="mb-2 text-[13px] font-semibold text-ink">难度 <span className="text-danger">*</span></div>
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {DIFFICULTIES.map((d) => {
            const dot = d === "入门" ? "bg-green-500" : d === "进阶" ? "bg-amber-500" : "bg-red-500";
            const desc = d === "入门" ? "照着步骤就能做出来" : d === "进阶" ? "需要一定 ROS2 基础" : "涉及底层开发与调参";
            return (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`rounded-xl border p-3 text-left transition-colors ${difficulty === d ? "border-primary bg-primary-soft shadow-[0_0_0_1px_var(--primary)]" : "border-border bg-white hover:border-border-strong"}`}>
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink"><span className={`h-2 w-2 rounded-full ${dot}`} />{d}</div>
                <div className="mt-0.5 text-[11px] text-ink-tertiary">{desc}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink">预计制作时长</div>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="如：2 个周末" className={inputCls} />
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink">开源协议 <span className="text-danger">*</span></div>
            <select value={license} onChange={(e) => setLicense(e.target.value)} className={inputCls}>
              {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </PubSection>

      <PubSection title="标签" sub={`最多 ${MAX_TAGS} 个 · 库内元器件已自动带入`}>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${tags.includes(t) ? "border-primary bg-primary text-white" : "border-border bg-white text-ink-secondary hover:border-primary hover:text-primary"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-2.5 text-xs text-ink-tertiary">已选 {tags.length} / {MAX_TAGS}</div>
      </PubSection>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-2.5 text-[15px] font-bold text-ink">发布前检查</h2>
        {preflight.items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 py-1.5 text-[13px]">
            <span className={`font-bold ${item.ok ? "text-green-500" : "text-amber-500"}`}>{item.ok ? "✓" : "!"}</span>
            <span className="text-ink">{item.label}</span>
            <span className="ml-auto text-xs text-ink-tertiary">
              {item.ok ? item.detail : (item.label === "封面图" ? "没有封面的项目在广场展示效果较差" : item.label === "演示视频" ? "可选 · 建议补一个 B 站链接" : item.detail)}
            </span>
          </div>
        ))}

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onBack} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm text-ink-secondary hover:border-primary hover:text-primary">← 返回编辑</button>
          {preflight.missingCount > 0 && (
            <button onClick={onSubmit} disabled={loading} className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              仍要发布（缺 {preflight.missingCount} 项建议内容）
            </button>
          )}
          <button onClick={onSubmit} disabled={loading}
            className={`rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 ${preflight.missingCount > 0 ? "" : "flex-[1.2]"}`}>
            {loading ? "发布中…" : "发布项目"}
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-tertiary">
          也可以像 Arduino Project Hub 一样改为<strong>「提交审核」</strong>模式：由管理员按内容规范检查后上线，质量更可控。
        </p>
      </div>
    </div>
  );
}

// ===================== 通用子组件 =====================
const inputCls =
  "w-full rounded-xl border border-border px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Block({ label, must, children }: { label: string; must?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-colors hover:border-border-strong sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold text-primary">{label}</h2>
        {must && <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-normal text-ink-tertiary">{must}</span>}
      </div>
      {children}
    </section>
  );
}

function SideCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">{children}</div>;
}

function MetaRow({ k, v, required, hint }: { k: string; v: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border py-2.5 text-[13px] last:border-b-0">
      <span className="text-ink-secondary">{k} {required && <span className="text-danger">*</span>}</span>
      <span className="font-semibold text-ink">{v}{hint && <span className="ml-1 text-[11px] font-normal text-ink-tertiary">{hint}</span>}</span>
    </div>
  );
}

function PubSection({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-[15px] font-bold text-ink">{title}{sub && <span className="ml-1.5 text-xs font-normal text-ink-tertiary">{sub}</span>}</h2>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border py-3 last:border-b-0">
      <div>
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className="text-xs text-ink-tertiary">{desc}</div>
      </div>
      <button onClick={onToggle} aria-checked={on} role="switch"
        className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-border-strong"}`}>
        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all ${on ? "right-0.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
