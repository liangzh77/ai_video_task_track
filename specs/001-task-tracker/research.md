# 研究文档：任务跟踪与模板管理系统

**分支**: `001-task-tracker` | **日期**: 2025-12-12

## 技术决策

### 1. 认证方案

**决策**: NextAuth.js v5（Auth.js）配合 Credentials Provider

**理由**:
- 与 Next.js App Router 深度集成
- 支持自定义用户名/密码认证（Credentials Provider）
- 内置会话管理，符合规格中的"基于会话的认证"假设
- 简单配置，符合"简单优先"原则
- 可扩展支持其他 OAuth 提供商（未来需要时）

**备选方案**:
- Lucia Auth：更轻量但社区较小，文档不如 NextAuth 完善
- 自定义 JWT：增加复杂性，需要自己处理会话管理
- Clerk/Auth0：第三方服务，增加依赖和成本

### 2. 数据库选择

**决策**: PostgreSQL + Prisma ORM，通过 Vercel Postgres 或 Supabase 托管

**理由**:
- PostgreSQL 是成熟的关系型数据库，支持复杂查询和事务
- Prisma 提供类型安全的数据库访问，与 TypeScript 完美配合
- Vercel Postgres 提供无缝集成，Supabase 提供更灵活的免费层
- 支持 JSON 字段存储有序列表（图片/文案顺序）

**备选方案**:
- SQLite：不适合 Vercel Serverless 环境（文件系统限制）
- MongoDB：对于这种结构化数据，关系型数据库更合适
- PlanetScale（MySQL）：同样优秀，但 PostgreSQL 更通用

### 3. 图片存储

**决策**: Vercel Blob

**理由**:
- 与 Vercel 平台原生集成
- 简单的 API 用于上传和获取图片
- 自动 CDN 分发
- 按量付费，适合小规模应用

**备选方案**:
- Cloudinary：功能更丰富（图片处理），但增加外部依赖
- AWS S3：需要额外配置和账户
- 本地文件系统：Vercel Serverless 不支持持久化文件

### 4. 拖拽排序库

**决策**: @dnd-kit/core + @dnd-kit/sortable

**理由**:
- 现代化的拖拽库，专为 React 设计
- 轻量级，模块化
- 支持触摸设备
- 良好的可访问性支持
- 活跃维护

**备选方案**:
- react-beautiful-dnd：Atlassian 已停止维护
- react-dnd：更底层，需要更多配置
- 原生 HTML5 拖拽：兼容性问题，触摸支持差

### 5. 样式方案

**决策**: Tailwind CSS

**理由**:
- 与 Next.js 开箱即用集成
- 工具类优先，快速开发
- 一致的设计系统
- 小打包体积（PurgeCSS）
- 符合宪法中的"CSS Modules、Tailwind CSS 或 CSS-in-JS"选项

**备选方案**:
- CSS Modules：更传统，但开发速度较慢
- styled-components：运行时开销，SSR 配置复杂

### 6. UI 组件库

**决策**: 不使用完整组件库，使用 Tailwind CSS 手写 + shadcn/ui 按需复制

**理由**:
- 符合"简单优先"原则，避免过度依赖
- shadcn/ui 是复制代码而非安装依赖，可完全控制
- 只引入需要的组件
- 与 Tailwind CSS 完美配合

**备选方案**:
- Material UI：过重，样式难以自定义
- Chakra UI：增加包体积
- Ant Design：企业风格，不够灵活

## 架构决策

### 数据获取策略

**决策**: React Server Components + Server Actions

**理由**:
- Next.js 14+ 推荐方式
- 减少客户端 JavaScript
- 简化数据获取逻辑
- 符合宪法"数据获取: React Server Components 和 Server Actions"

### 状态管理

**决策**: React 内置（useState、useContext）+ URL 状态（searchParams）

**理由**:
- 应用状态简单，不需要 Redux/Zustand
- 符合宪法"状态管理: 优先使用 React 内置功能"
- URL 状态用于预览面板当前图片（可分享链接）

### 认证流程

```
登录流程:
1. 用户访问 /login
2. 提交用户名/密码
3. NextAuth Credentials Provider 验证
4. 创建会话，设置 cookie
5. 根据角色重定向：admin → /admin, user → /dashboard

注册流程:
1. 用户访问 /register
2. 提交用户名/密码
3. Server Action 创建用户（密码 bcrypt 哈希）
4. 自动登录，重定向到 /dashboard
```

### 权限控制

```
中间件检查:
- /admin/* → 必须是 admin 角色
- /dashboard/* → 必须已登录
- API routes → 根据操作检查 canCRUD/canApprove 权限
```

## 性能优化策略

1. **图片优化**:
   - 使用 next/image 自动优化
   - 缩略图使用 100px 高度的变体
   - 预览面板延迟加载大图

2. **数据加载**:
   - 模板/任务列表分页或虚拟滚动（如果数据量大）
   - 编辑时乐观更新

3. **拖拽性能**:
   - 使用 useMemo 避免不必要的重渲染
   - 拖拽时使用 CSS transform 而非重排

## 待确认项

所有技术选型已确定，无待澄清项。
