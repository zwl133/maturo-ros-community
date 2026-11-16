# 出云科技 · 开源硬件项目社区

面向硬件爱好者与学生的开源硬件项目社区——浏览、筛选、收藏可复刻的硬件项目，照着做出来。

## 技术栈

- **框架**：Next.js 16（App Router，服务端渲染）
- **样式**：Tailwind CSS 4（设计 token：云青主色 #2AA6A0）
- **数据**：静态种子数据（12 个真实硬件项目）+ 运行时 JSON
- **部署**：Vercel / Cloudflare Pages 免费额度
- **鉴权**：单管理员口令 + HttpOnly Cookie（演示级）

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev
# 打开 http://localhost:3000

# 生产构建 + 启动
npm run build
npm run start
```

## 环境变量

复制 `.env.example` 为 `.env`，修改管理员口令：

```bash
ADMIN_PASSWORD=chuyun2026  # 演示默认值，生产环境务必修改
```

## 页面地图

| 路由 | 说明 |
|------|------|
| `/` | 首页：Hero + 分类宫格 + 精选 + 最新 + 价值主张 |
| `/explore` | 列表页：搜索 + 分类/难度/标签筛选 + 排序（URL 同步可分享） |
| `/p/[slug]` | 项目详情：9 区块（封面/简介/标签/预览图/BOM/附件/步骤/版本/评论） |
| `/u/[handle]` | 作者主页：简介 + 数据 + 项目列表 |
| `/me/collections` | 我的收藏（本地持久化） |
| `/admin/login` | 后台登录 |
| `/admin` | 后台：项目列表 + 标签维护（需登录） |
| `/about` | 关于 + 开源协议说明 + 免责声明 |

## 目录结构

```
app/
  page.tsx              首页
  explore/              列表页（ExploreClient 客户端交互）
  p/[slug]/             项目详情
  u/[handle]/           作者主页
  me/collections/       我的收藏
  admin/                后台
  about/                关于
  api/                  Route Handler（登录/登出/项目）
components/
  Navbar.tsx            导航栏
  Footer.tsx            页脚
  SiteLayout.tsx        站点布局
  ProjectCard.tsx       项目卡片
  CommentSection.tsx    评论区
  actions.tsx           收藏/点赞/复制 BOM
lib/
  types.ts              数据模型类型
  repository.ts         数据访问（仓储层）
  auth.ts               会话管理
  data/
    meta.ts             分类/标签/难度/用户
    projects.ts         12 个种子项目
    comments.ts         种子评论
```

## 已实现功能

- [x] 首页探索流（精选 + 最新 + 分类宫格）
- [x] 搜索（标题/简介/标签/BOM 型号模糊匹配，300ms 防抖）
- [x] 多维筛选（分类/难度/标签多选 + 排序，URL 同步）
- [x] 项目详情 9 区块（含 BOM 表格、附件、步骤、版本记录）
- [x] 收藏/点赞（本地持久化）
- [x] 评论（本地演示）
- [x] 作者主页
- [x] 极简后台（登录 + 项目列表）
- [x] BOM 复制（TSV 格式）
- [x] 移动端不崩降级（响应式布局）

## 待办（二期）

- 前台「发布项目」入口（含审核流、图片上传）
- 3D 外壳展示、复刻者列表
- 评论回复层级、关注与动态流
- 榜单、专题合集、竞赛活动
- 移动端完整适配

## 明确不做（首版）

- 交易全链路（价格、库存、下单、支付、退款）
- 真实打样/供应链对接
- 私信、消息中心
- 多语言、深色模式
- 工程文件在线解析

## 注意事项

- 本后台为**演示级鉴权**（单口令 + HttpOnly Cookie），长期公网运行前必须升级为正式鉴权（如 JWT + 刷新令牌 + RBAC）。
- 种子项目的 BOM 型号为真实常用器件，但价格为**参考价**，实际以采购渠道为准。
- 封面图与预览图当前为占位（emoji 渐变），接入真实项目时替换为实际图片 URL。
