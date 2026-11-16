// 出云 ROS 机器人社区 前端数据类型定义

export interface AuthorBrief {
  handle: string;
  name: string | null;
  avatar: string | null;
  bio?: string | null;
}

export interface BomItem {
  id?: string;
  designator: string;
  partNo: string;
  package: string | null;
  qty: number;
  unitPrice: number;
  note: string | null;
  order?: number;
}

export interface Attachment {
  id?: string;
  name: string;
  type: string;
  size: string | null;
  url: string | null;
}

export interface Step {
  id?: string;
  order: number;
  title: string;
  content: string;
  image?: string | null;
}

export interface ProjectVersion {
  id?: string;
  ver: string;
  date: string;
  changelog: string;
}

// 服务层序列化后的项目类型（前端展示用）
export interface SerializedProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  cover: string | null;
  category: string;
  difficulty: string;
  tags: string[];
  license: string;
  costEstimate: number;
  status: string;
  views: number;
  likeCount: number;
  collectCount: number;
  likes: number; // = likeCount
  collects: number; // = collectCount
  comments: number;
  authorId: string;
  author: AuthorBrief;
  deleted?: boolean; // 软删除标记（收藏列表：原作品已删除）
  createdAt: string | Date;
  updatedAt: string | Date;
  bom?: BomItem[];
  attachments?: Attachment[];
  steps?: Step[];
  versions?: ProjectVersion[];
  _count?: { comments: number };
}

export interface UserBrief {
  id: string;
  email: string;
  handle: string;
  name: string | null;
  avatar: string | null;
  role: string;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string | Date;
  deleted: boolean;
  author: AuthorBrief;
}
