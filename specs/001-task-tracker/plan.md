# 实施计划：任务跟踪与模板管理系统

**分支**: `001-task-tracker` | **日期**: 2025-12-12 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格来自 `/specs/001-task-tracker/spec.md`

## 概要

构建一个任务跟踪 Web 应用，支持用户认证（管理员/普通用户）、基于模板的内容管理、多图片/多文案拖拽排序、以及图片预览功能。部署在 Vercel 平台。

## 技术上下文

**语言/版本**: TypeScript 5.x（严格模式）
**框架**: Next.js 14+（App Router）
**主要依赖**:
- next-auth（认证）
- prisma（ORM）
- @dnd-kit/core（拖拽排序）
- tailwindcss（样式）

**存储**:
- PostgreSQL（Vercel Postgres 或 Supabase）
- 图片存储：Vercel Blob 或 Cloudinary

**测试**: Jest + React Testing Library
**目标平台**: Web（Vercel 部署）
**项目类型**: Web 应用（Next.js 全栈）

**性能目标**:
- 页面加载 < 3 秒
- 图片上传 < 5 秒（5MB 以内）
- 缩略图点击预览 < 500ms

**约束**:
- 10 并发用户
- 图片限制 5MB
- Vercel 免费/Pro 层级限制

**规模/范围**:
- 单租户应用
- 约 10 个页面/组件
- 3 个核心实体（User、Template、Task）

## 宪法检查

*门禁: 必须在 Phase 0 研究前通过。Phase 1 设计后重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| 一、简单优先 | ✅ 通过 | 使用成熟的库（Next.js、Prisma、next-auth），避免自定义实现 |
| 二、代码清晰 | ✅ 通过 | TypeScript 严格模式、ESLint、Prettier 强制执行 |
| 三、可维护性 | ✅ 通过 | 分离 UI 组件、业务逻辑（Server Actions）、数据访问（Prisma） |
| 四、Vercel 优化 | ✅ 通过 | Next.js App Router、Serverless API Routes、Vercel Blob/Postgres |
| 五、Web 标准 | ✅ 通过 | HTTPS（Vercel 默认）、响应式设计、语义化 HTML |

## 项目结构

### 文档（本功能）

```text
specs/001-task-tracker/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出（API 合约）
└── tasks.md             # Phase 2 输出（/speckit.tasks 命令）
```

### 源代码（仓库根目录）

```text
src/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/             # 认证相关页面组
│   │   ├── login/
│   │   └── register/
│   ├── (admin)/            # 管理员页面组
│   │   └── admin/
│   ├── (dashboard)/        # 普通用户页面组
│   │   └── dashboard/
│   ├── api/                # API 路由
│   │   ├── auth/
│   │   ├── users/
│   │   ├── templates/
│   │   ├── tasks/
│   │   └── upload/
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React 组件
│   ├── ui/                 # 通用 UI 组件
│   ├── auth/               # 认证相关组件
│   ├── admin/              # 管理员组件
│   ├── template/           # 模板相关组件
│   ├── task/               # 任务相关组件
│   └── image/              # 图片相关组件
├── lib/                    # 工具库
│   ├── auth.ts             # 认证配置
│   ├── db.ts               # Prisma 客户端
│   └── utils.ts            # 工具函数
├── types/                  # TypeScript 类型定义
└── styles/                 # 全局样式

prisma/
├── schema.prisma           # 数据库模型
└── seed.ts                 # 种子数据（admin 用户）

public/                     # 静态资源
```

**结构决策**: 使用 Next.js App Router 全栈结构，利用 Route Groups 分离认证、管理员、普通用户页面。API 使用 Route Handlers 实现。

## 复杂性跟踪

> **仅在宪法检查有需要解释的违规时填写**

无违规，符合所有原则。
