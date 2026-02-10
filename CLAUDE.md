# ai_video_task_track 开发指南

自动生成自功能计划。最后更新: 2025-01-31

## 活跃技术栈

- **框架**: Next.js 16 (App Router, Tailwind v4)
- **语言**: TypeScript 5.x (严格模式)
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js v5
- **拖拽**: @dnd-kit/core + @dnd-kit/sortable
- **图片存储**: Vercel Blob
- **部署**: Vercel

## 项目结构

```text
src/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/             # 认证相关页面组
│   ├── (admin)/            # 管理员页面组
│   ├── (dashboard)/        # 普通用户页面组
│   └── api/                # API 路由
├── components/             # React 组件
│   ├── ui/                 # 通用 UI 组件
│   ├── auth/               # 认证相关组件
│   ├── admin/              # 管理员组件
│   ├── template/           # 模板相关组件
│   ├── task/               # 任务相关组件
│   └── image/              # 图片相关组件
├── lib/                    # 工具库
├── types/                  # TypeScript 类型定义
└── styles/                 # 全局样式

prisma/
├── schema.prisma           # 数据库模型
└── seed.ts                 # 种子数据

specs/                      # 功能规格文档
```

## 本地开发启动（重要）

**Windows 环境下必须使用 `--webpack` 参数启动开发服务器：**

```bash
npx next dev --webpack
```

**原因：** Next.js 16 默认使用 Turbopack，但 Turbopack 在 Windows 上存在 bug，会尝试读取 `nul` 文件（Windows 保留设备名），导致崩溃。使用 `--webpack` 可以切换到 Webpack 编译器，避免此问题。

**启动前确保：**
1. 已配置 `.env` 文件（从 Vercel 获取环境变量）
2. 已运行 `npx prisma generate` 生成 Prisma Client

## 常用命令

```bash
# 开发（Windows 必须加 --webpack）
npx next dev --webpack

# 构建
npm run build

# 类型检查
npm run type-check

# Lint
npm run lint

# Prisma
npx prisma generate    # 生成客户端
npx prisma db push     # 推送 schema
npx prisma studio      # 打开 Studio
npx prisma db seed     # 运行种子数据
```

## 代码风格

- 使用函数组件 + Hooks（禁止类组件）
- TypeScript 严格模式，避免使用 `any`
- Tailwind CSS 工具类（避免内联样式）
- 使用 React Server Components 和 Server Actions
- 遵循宪法原则：简单优先、代码清晰、可维护性

## 核心实体

- **User**: 用户账户（admin/普通用户，canCRUD/canApprove 权限）
- **Template**: 内容模板（名称、图片列表、文案列表）
- **Task**: 任务项（属于模板，包含图片、文案、指标等）

## 权限模型

| 角色 | 查看用户 | 管理权限 | 查看任务 | CRUD 内容 | 批准 |
|------|---------|---------|---------|----------|------|
| Admin | ✅ | ✅ | ❌ | ❌ | ❌ |
| User (默认) | ❌ | ❌ | ✅ | ❌ | ❌ |
| User + CRUD | ❌ | ❌ | ✅ | ✅ | ❌ |
| User + Approve | ❌ | ❌ | ✅ | ❌ | ✅ |

## 最近变更

- 2025-12-12: 初始化项目规划，创建 001-task-tracker 功能

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
