import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SerializedProject } from "@/lib/types";

// ===== 服务层：项目（查询 / 发布 / 收藏 / 点赞 / 评论）=====

export interface ProjectFilter {
  q?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  sort?: "latest" | "hot" | "most-collected";
}

// 解析 tags 字符串为数组
function parseTags(tags: string): string[] {
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

// 序列化项目（tags 字符串 → 数组，计数统计）
function serializeProject(p: any): SerializedProject {
  return {
    ...p,
    tags: parseTags(p.tags),
    likes: p.likeCount,
    collects: p.collectCount,
    comments: p._count?.comments ?? 0,
    author: p.author ? { handle: p.author.handle, name: p.author.name, avatar: p.author.avatar } : undefined,
  } as SerializedProject;
}

// 查询项目列表（带筛选、排序、分页）
export async function listProjects(filter: ProjectFilter = {}) {
  const where: Prisma.ProjectWhereInput = { status: "published", deletedAt: null };

  if (filter.q) {
    const q = filter.q.trim();
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
      ];
    }
  }
  if (filter.category) where.category = filter.category;
  if (filter.difficulty) where.difficulty = filter.difficulty;

  let orderBy: Prisma.ProjectOrderByWithRelationInput;
  switch (filter.sort) {
    case "latest":
      orderBy = { createdAt: "desc" };
      break;
    case "most-collected":
      orderBy = { collectCount: "desc" };
      break;
    case "hot":
    default:
      // 热度：收藏×2 + 浏览×0.1，SQLite 用原始计算排序
      orderBy = { collectCount: "desc" };
      break;
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy,
    include: {
      author: { select: { handle: true, name: true, avatar: true } },
      _count: { select: { comments: true } },
    },
    take: 100,
  });

  let result = projects.map(serializeProject);

  // 标签过滤（JSON 字段无法在 SQL 精确过滤，这里后置过滤）
  if (filter.tags && filter.tags.length > 0) {
    result = result.filter((p) => filter.tags!.every((t) => p.tags.includes(t)));
  }

  // hot 排序：收藏×2 + 浏览×0.1
  if (filter.sort === "hot" || !filter.sort) {
    result = result.sort((a, b) => (b.collectCount * 2 + b.views * 0.1) - (a.collectCount * 2 + a.views * 0.1));
  }

  return result;
}

// 获取单个项目详情（含 BOM、附件、步骤、版本、作者）
// includeDraftOwnerId：传入作者 id 时，允许返回该作者自己的草稿（用于编辑页加载）
export async function getProjectBySlug(slug: string, includeDraftOwnerId?: string) {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      author: { select: { handle: true, name: true, avatar: true, bio: true } },
      bom: { orderBy: { order: "asc" } },
      attachments: { orderBy: { order: "asc" } },
      steps: { orderBy: { order: "asc" } },
      versions: { orderBy: { date: "desc" } },
      _count: { select: { comments: true } },
    },
  });

  if (!project || project.deletedAt) return null;
  // 草稿仅作者本人可见
  if (project.status !== "published") {
    if (!includeDraftOwnerId || project.authorId !== includeDraftOwnerId) return null;
  }
  return serializeProject(project);
}

// 获取作者的项目列表
export async function getProjectsByAuthor(handle: string) {
  const user = await prisma.user.findUnique({ where: { handle } });
  if (!user) return [];

  const projects = await prisma.project.findMany({
    where: { authorId: user.id, status: "published", deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { handle: true, name: true, avatar: true } },
      _count: { select: { comments: true } },
    },
  });
  return projects.map(serializeProject);
}

// 获取当前用户自己的全部项目（含草稿，仅本人可见）
export async function getMyProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { authorId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { handle: true, name: true, avatar: true } },
      _count: { select: { comments: true } },
    },
  });
  return projects.map(serializeProject);
}

// 获取作者信息
export async function getUserByHandle(handle: string) {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      handle: true,
      name: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });
  if (!user) return null;
  return user;
}

// 发布项目（含 BOM、步骤等子表，事务写入）
// status: published（发布）| draft（草稿，仅自己可见）
export async function createProject(input: {
  userId: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  license: string;
  cover?: string;
  costEstimate?: number;
  status?: string;
  bom?: { designator: string; partNo: string; package?: string; qty: number; unitPrice?: number; note?: string }[];
  steps?: { order: number; title: string; content: string; image?: string }[];
  attachments?: { name: string; type: string; url?: string; size?: string }[];
}) {
  // 生成 slug（ASCII 安全：去掉非字母数字字符，追加时间戳保证唯一）
  const slugBase = input.title
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "project";
  // 去掉中文等非 ASCII 字符，避免 URL 编码问题
  const slugAscii = slugBase.replace(/[^\x00-\x7f]/g, "").replace(/^-+|-+$/g, "") || "project";
  const slug = `${slugAscii}-${Date.now().toString(36)}`;

  const project = await prisma.project.create({
    data: {
      title: input.title,
      slug,
      summary: input.summary,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      tags: JSON.stringify(input.tags),
      license: input.license,
      cover: input.cover,
      costEstimate: input.costEstimate ?? 0,
      authorId: input.userId,
      status: input.status === "draft" ? "draft" : "published", // 草稿或发布
      bom: input.bom?.length
        ? { create: input.bom.map((b, i) => ({ ...b, order: i })) }
        : undefined,
      steps: input.steps?.length
        ? { create: input.steps.map((s) => ({ ...s })) }
        : undefined,
      attachments: input.attachments?.length
        ? { create: input.attachments.map((a, i) => ({ ...a, order: i })) }
        : undefined,
      versions: {
        create: [{ ver: "v1.0", date: new Date().toISOString().slice(0, 10), changelog: "首版发布" }],
      },
    },
  });

  return project;
}

// 更新项目（仅作者本人，编辑时重建子表）
export async function updateProject(
  slug: string,
  userId: string,
  input: {
    title: string;
    summary: string;
    description: string;
    category: string;
    difficulty: string;
    tags: string[];
    license: string;
    cover?: string;
    costEstimate?: number;
    status?: string;
    bom?: { designator: string; partNo: string; package?: string; qty: number; unitPrice?: number; note?: string }[];
    steps?: { order: number; title: string; content: string; image?: string }[];
    attachments?: { name: string; type: string; url?: string; size?: string }[];
  }
) {
  // 确认项目存在且属于当前用户
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (!existing) return { error: "项目不存在" } as const;
  if (existing.authorId !== userId) return { error: "无权限编辑此项目" } as const;

  await prisma.$transaction(async (tx) => {
    // 1. 更新主表
    await tx.project.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        summary: input.summary,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        tags: JSON.stringify(input.tags),
        license: input.license,
        cover: input.cover ?? null,
        costEstimate: input.costEstimate ?? 0,
        // 仅在明确传入 status 时更新（避免草稿被编辑操作意外改回发布）
        ...(input.status === "draft" || input.status === "published" ? { status: input.status } : {}),
      },
    });

    // 2. 重建子表（先删后建，简单可靠）
    await tx.bomItem.deleteMany({ where: { projectId: existing.id } });
    await tx.step.deleteMany({ where: { projectId: existing.id } });
    await tx.attachment.deleteMany({ where: { projectId: existing.id } });

    if (input.bom?.length) {
      await tx.bomItem.createMany({
        data: input.bom.map((b, i) => ({ ...b, order: i, projectId: existing.id })),
      });
    }
    if (input.steps?.length) {
      await tx.step.createMany({
        data: input.steps.map((s) => ({ ...s, projectId: existing.id })),
      });
    }
    if (input.attachments?.length) {
      await tx.attachment.createMany({
        data: input.attachments.map((a, i) => ({ ...a, order: i, projectId: existing.id })),
      });
    }
  });

  return { ok: true, slug } as const;
}

// 删除项目（软删除：标记 deletedAt，保留收藏记录供收藏列表显示"原作品已删除"）
// 作者可删自己的项目，管理员可删任意项目
export async function deleteProject(slug: string, userId: string, isAdmin: boolean) {
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (!existing) return { error: "项目不存在" } as const;
  if (existing.authorId !== userId && !isAdmin) return { error: "无权限删除此项目" } as const;
  if (existing.deletedAt) return { error: "项目已删除" } as const;

  await prisma.project.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  return { ok: true, slug } as const;
}

// 收藏/取消收藏（幂等：重复收藏返回当前状态）
export async function toggleCollect(userId: string, projectId: string) {
  const existing = await prisma.collection.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (existing) {
    await prisma.collection.delete({ where: { id: existing.id } });
    await prisma.project.update({
      where: { id: projectId },
      data: { collectCount: { decrement: 1 } },
    });
    return { collected: false };
  }

  await prisma.collection.create({ data: { userId, projectId } });
  await prisma.project.update({
    where: { id: projectId },
    data: { collectCount: { increment: 1 } },
  });
  return { collected: true };
}

// 点赞/取消点赞
export async function toggleLike(userId: string, projectId: string) {
  const existing = await prisma.like.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.project.update({
      where: { id: projectId },
      data: { likeCount: { decrement: 1 } },
    });
    return { liked: false };
  }

  await prisma.like.create({ data: { userId, projectId } });
  await prisma.project.update({
    where: { id: projectId },
    data: { likeCount: { increment: 1 } },
  });
  return { liked: true };
}

// 查询用户是否已收藏/点赞
export async function getUserInteraction(userId: string, projectId: string) {
  const [collect, like] = await Promise.all([
    prisma.collection.findUnique({ where: { userId_projectId: { userId, projectId } } }),
    prisma.like.findUnique({ where: { userId_projectId: { userId, projectId } } }),
  ]);
  return { collected: !!collect, liked: !!like };
}

// 发表评论（返回带作者信息的完整评论，供前端即时追加）
export async function createComment(userId: string, projectId: string, content: string) {
  return prisma.comment.create({
    data: { authorId: userId, projectId, content },
    include: { author: { select: { handle: true, name: true, avatar: true } } },
  });
}

// 获取项目评论
export async function listComments(projectId: string) {
  return prisma.comment.findMany({
    where: { projectId, deleted: false },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { handle: true, name: true, avatar: true } } },
  });
}
