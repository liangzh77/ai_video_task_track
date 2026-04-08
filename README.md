# ai_video_task_track

AI 视频任务跟踪与模板管理系统。用于管理模板、任务、素材与投放数据，并提供视频导入、指标导入等接口。

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma 7
- PostgreSQL
- NextAuth.js v5

## 核心能力

- 用户登录与权限控制
- 模板与任务管理
- 图片与视频素材管理
- 视频导入并自动创建模板
- 投放效果数据导入与按素材匹配任务

## 项目结构

```text
src/
├── app/           # 页面与 API 路由
├── components/    # UI 与业务组件
├── lib/           # 工具库与服务封装
├── types/         # 类型定义
└── styles/        # 样式

prisma/
├── schema.prisma  # 数据库模型
└── seed.ts        # 种子数据

docs/              # 接口与外部对接文档
specs/             # 需求规格与实施文档
```

## 环境要求

- Node.js 18+
- npm
- PostgreSQL 数据库

## 环境变量

可参考 [`.env.example`](./.env.example)：

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
BLOB_READ_WRITE_TOKEN=
TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_REGION=
TENCENT_COS_BUCKET=
IMPORT_API_KEY=
```

## 本地开发

安装依赖：

```bash
npm install
```

初始化 Prisma：

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

启动开发环境：

```bash
npx next dev --webpack
```

Windows 下建议使用 `--webpack`。Next.js 16 默认的 Turbopack 在当前项目环境里可能触发 `nul` 相关问题，`--webpack` 更稳妥。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run type-check
npm run db:push
```

## 构建

```bash
npm run build
npm run start
```

当前 `build` 脚本会先执行：

```bash
prisma generate && prisma db push --accept-data-loss && next build
```

这意味着构建前会同步数据库 schema，使用前需要确认这符合你的部署流程。

## 默认数据

种子数据文档中提到默认管理员账户：

- 用户名：`admin`
- 密码：`admin123`

如果本地种子脚本已调整，以实际 `prisma/seed.ts` 为准。

## 相关文档

- [CLAUDE.md](./CLAUDE.md): 开发指南
- [docs/api-import-video.md](./docs/api-import-video.md): 视频导入 API
- [docs/api-import-metrics.md](./docs/api-import-metrics.md): 投放指标导入 API
- [docs/bridge_segment_api.md](./docs/bridge_segment_api.md): 其他桥接接口说明
- [specs/001-task-tracker/quickstart.md](./specs/001-task-tracker/quickstart.md): 快速开始
- [specs/001-task-tracker/spec.md](./specs/001-task-tracker/spec.md): 功能规格
- [specs/001-task-tracker/plan.md](./specs/001-task-tracker/plan.md): 实施计划
- [specs/001-task-tracker/data-model.md](./specs/001-task-tracker/data-model.md): 数据模型
- [specs/001-task-tracker/contracts/api.md](./specs/001-task-tracker/contracts/api.md): API 合约

## 项目信息

- 包名：`ai-video-task-track`
- 当前版本：`0.1.0`
