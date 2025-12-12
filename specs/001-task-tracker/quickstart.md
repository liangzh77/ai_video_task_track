# 快速开始：任务跟踪与模板管理系统

**分支**: `001-task-tracker` | **日期**: 2025-12-12

## 前提条件

- Node.js 18+
- npm 或 pnpm
- PostgreSQL 数据库（本地或云端）

## 安装步骤

### 1. 克隆并安装依赖

```bash
git clone <repository-url>
cd ai_video_task_track
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/task_tracker"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob（图片存储）
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库 schema
npx prisma db push

# 运行种子数据（创建 admin 用户）
npx prisma db seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

## 主要功能路径

| 路径 | 说明 | 访问权限 |
|------|------|----------|
| `/login` | 登录页面 | 公开 |
| `/register` | 注册页面 | 公开 |
| `/admin` | 管理员仪表板 | 仅管理员 |
| `/dashboard` | 任务跟踪页面 | 已登录用户 |

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 类型检查
npm run type-check

# Lint 检查
npm run lint

# 格式化代码
npm run format

# 数据库管理
npx prisma studio      # 打开 Prisma Studio
npx prisma migrate dev # 创建迁移
npx prisma db push     # 推送 schema 变更
```

## 部署到 Vercel

### 1. 连接仓库

在 Vercel Dashboard 中导入 GitHub 仓库。

### 2. 配置环境变量

在 Vercel 项目设置中添加：

- `DATABASE_URL` - Vercel Postgres 或 Supabase 连接字符串
- `NEXTAUTH_SECRET` - 生成的密钥
- `NEXTAUTH_URL` - 生产环境 URL
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob 令牌

### 3. 配置构建命令

Vercel 会自动检测 Next.js 项目。确保 `package.json` 中有：

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### 4. 部署

推送到 main 分支自动触发部署。

## 故障排除

### 数据库连接失败

1. 检查 `DATABASE_URL` 格式
2. 确保数据库服务运行中
3. 检查网络/防火墙设置

### Prisma 错误

```bash
# 重新生成客户端
npx prisma generate

# 重置数据库（开发环境）
npx prisma db push --force-reset
```

### NextAuth 错误

1. 确保 `NEXTAUTH_SECRET` 已设置
2. 检查 `NEXTAUTH_URL` 与实际访问地址匹配

### 图片上传失败

1. 检查 `BLOB_READ_WRITE_TOKEN` 是否有效
2. 确认文件大小不超过 5MB
3. 确认文件类型为 JPEG/PNG/GIF/WebP

## 项目结构

```
src/
├── app/                # Next.js 页面和 API
├── components/         # React 组件
├── lib/               # 工具库
└── types/             # TypeScript 类型

prisma/
├── schema.prisma      # 数据库模型
└── seed.ts            # 种子数据

specs/001-task-tracker/
├── spec.md            # 功能规格
├── plan.md            # 实施计划
├── research.md        # 研究文档
├── data-model.md      # 数据模型
├── contracts/         # API 合约
└── quickstart.md      # 本文档
```
