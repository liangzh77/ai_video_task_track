# 数据模型：任务跟踪与模板管理系统

**分支**: `001-task-tracker` | **日期**: 2025-12-12

## 实体关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Template   │       │    Task     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ username    │       │ name        │       │ templateId  │──┐
│ password    │       │ images[]    │       │ images[]    │  │
│ role        │       │ copyTexts[] │       │ copyTexts[] │  │
│ canCRUD     │       │ createdAt   │       │ notes       │  │
│ canApprove  │       │ updatedAt   │       │ isApproved  │  │
│ createdAt   │       │ order       │       │ creatorId   │──┼──┐
│ updatedAt   │       └─────────────┘       │ publishDate │  │  │
└─────────────┘              │              │ exposure    │  │  │
                             │ 1:N          │ registrations│  │  │
                             ▼              │ profit      │  │  │
                       ┌─────────────┐      │ createdAt   │  │  │
                       │    Task     │◄─────│ updatedAt   │  │  │
                       └─────────────┘      │ order       │  │  │
                                            └─────────────┘  │  │
                                                   │         │  │
                                                   └─────────┘  │
                                                   templateId   │
                                                                │
                                            ┌───────────────────┘
                                            │ creatorId (User.id)
                                            ▼
                                      ┌─────────────┐
                                      │    User     │
                                      └─────────────┘
```

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

model User {
  id         String   @id @default(cuid())
  username   String   @unique
  password   String   // bcrypt hashed
  role       Role     @default(USER)
  canCRUD    Boolean  @default(false)
  canApprove Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // 关联：用户创建的任务
  createdTasks Task[] @relation("TaskCreator")

  @@map("users")
}

model Template {
  id        String   @id @default(cuid())
  name      String
  images    Json     @default("[]") // 有序图片 URL 数组: string[]
  copyTexts Json     @default("[]") // 有序文案数组: string[]
  order     Int      @default(0)    // 模板排序
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联：模板下的任务
  tasks Task[]

  @@map("templates")
}

model Task {
  id            String    @id @default(cuid())
  templateId    String
  images        Json      @default("[]") // 有序图片 URL 数组: string[]
  copyTexts     Json      @default("[]") // 有序文案数组: string[]
  notes         String    @default("")
  isApproved    Boolean   @default(false)
  creatorId     String?   // 可选，制作人
  publishDate   DateTime?
  exposure      Int       @default(0)
  registrations Int       @default(0)
  profit        Float     @default(0)
  order         Int       @default(0) // 任务在模板内的排序
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联
  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  creator  User?    @relation("TaskCreator", fields: [creatorId], references: [id], onDelete: SetNull)

  @@map("tasks")
}
```

## 字段说明

### User（用户）

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | String | 主键 | CUID 自动生成 |
| username | String | 用户名 | 唯一，必填 |
| password | String | 密码 | bcrypt 哈希，必填 |
| role | Enum | 角色 | ADMIN 或 USER |
| canCRUD | Boolean | CRUD 权限 | 默认 false |
| canApprove | Boolean | 批准权限 | 默认 false |
| createdAt | DateTime | 创建时间 | 自动 |
| updatedAt | DateTime | 更新时间 | 自动 |

### Template（模板）

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | String | 主键 | CUID 自动生成 |
| name | String | 模板名称 | 必填 |
| images | Json | 图片 URL 列表 | 有序数组 |
| copyTexts | Json | 文案列表 | 有序数组 |
| order | Int | 排序序号 | 用于模板排序 |
| createdAt | DateTime | 创建时间 | 自动 |
| updatedAt | DateTime | 更新时间 | 自动 |

### Task（任务）

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | String | 主键 | CUID 自动生成 |
| templateId | String | 所属模板 | 外键，级联删除 |
| images | Json | 图片 URL 列表 | 有序数组 |
| copyTexts | Json | 文案列表 | 有序数组 |
| notes | String | 备注 | 可选 |
| isApproved | Boolean | 是否批准 | 默认 false |
| creatorId | String | 制作人 | 可选，外键 |
| publishDate | DateTime | 上架时间 | 可选 |
| exposure | Int | 曝光数 | 默认 0 |
| registrations | Int | 注册数 | 默认 0 |
| profit | Float | 利润 | 默认 0 |
| order | Int | 排序序号 | 模板内任务排序 |
| createdAt | DateTime | 创建时间 | 自动 |
| updatedAt | DateTime | 更新时间 | 自动 |

## 种子数据

```typescript
// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 创建管理员账户
  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: Role.ADMIN,
      canCRUD: false,    // 管理员不能操作内容
      canApprove: false, // 管理员不能批准
    },
  })

  console.log('Seed completed: admin user created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## 验证规则

### 用户注册
- username: 必填，3-20 字符，字母数字下划线，唯一
- password: 必填，6-50 字符

### 模板/任务
- name: 必填，1-100 字符
- images: 每个 URL 必须是有效 URL
- copyTexts: 每条文案 1-5000 字符
- exposure/registrations: 非负整数
- profit: 数字（可为负）

## 索引

```prisma
// 在 schema.prisma 中添加索引优化查询

model Template {
  // ... 字段定义 ...
  @@index([order])
}

model Task {
  // ... 字段定义 ...
  @@index([templateId])
  @@index([templateId, order])
  @@index([creatorId])
}
```
