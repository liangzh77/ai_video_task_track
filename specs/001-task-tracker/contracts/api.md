# API 合约：任务跟踪与模板管理系统

**分支**: `001-task-tracker` | **日期**: 2025-12-12

## 概述

所有 API 端点使用 Next.js Route Handlers 实现，位于 `src/app/api/` 目录。

**通用响应格式**:
```typescript
// 成功
{ data: T }

// 错误
{ error: string, code?: string }
```

**认证**: 所有 API（除 auth 相关）需要有效的 NextAuth session。

---

## 1. 认证 API

### POST /api/auth/register

注册新用户。

**请求**:
```typescript
{
  username: string  // 3-20 字符
  password: string  // 6-50 字符
}
```

**响应**:
```typescript
// 201 Created
{ data: { id: string, username: string } }

// 400 Bad Request
{ error: "用户名已存在" }
{ error: "用户名必须是3-20个字符" }
{ error: "密码必须是6-50个字符" }
```

### POST /api/auth/[...nextauth]

NextAuth.js 处理的认证端点（登录、登出、会话等）。

---

## 2. 用户管理 API（仅管理员）

### GET /api/users

获取所有用户列表。

**权限**: 仅 ADMIN

**响应**:
```typescript
// 200 OK
{
  data: Array<{
    id: string
    username: string
    role: "ADMIN" | "USER"
    canCRUD: boolean
    canApprove: boolean
    createdAt: string
  }>
}

// 403 Forbidden
{ error: "无权限" }
```

### PATCH /api/users/[id]/permissions

更新用户权限。

**权限**: 仅 ADMIN

**请求**:
```typescript
{
  canCRUD?: boolean
  canApprove?: boolean
}
```

**响应**:
```typescript
// 200 OK
{ data: { id: string, canCRUD: boolean, canApprove: boolean } }

// 404 Not Found
{ error: "用户不存在" }
```

### POST /api/users/[id]/reset-password

重置用户密码为默认密码 "123456"。

**权限**: 仅 ADMIN

**响应**:
```typescript
// 200 OK
{ data: { message: "密码已重置" } }

// 404 Not Found
{ error: "用户不存在" }
```

---

## 3. 模板 API

### GET /api/templates

获取所有模板及其任务。

**权限**: 已登录用户（非 ADMIN）

**响应**:
```typescript
// 200 OK
{
  data: Array<{
    id: string
    name: string
    images: string[]
    copyTexts: string[]
    order: number
    tasks: Array<{
      id: string
      images: string[]
      copyTexts: string[]
      notes: string
      isApproved: boolean
      creator: { id: string, username: string } | null
      publishDate: string | null
      exposure: number
      registrations: number
      profit: number
      order: number
    }>
  }>
}
```

### POST /api/templates

创建新模板。

**权限**: canCRUD = true

**请求**:
```typescript
{
  name: string
  images?: string[]
  copyTexts?: string[]
}
```

**响应**:
```typescript
// 201 Created
{ data: { id: string, name: string, ... } }

// 403 Forbidden
{ error: "无 CRUD 权限" }
```

### PATCH /api/templates/[id]

更新模板。

**权限**: canCRUD = true

**请求**:
```typescript
{
  name?: string
  images?: string[]
  copyTexts?: string[]
  order?: number
}
```

**响应**:
```typescript
// 200 OK
{ data: { id: string, ... } }

// 404 Not Found
{ error: "模板不存在" }
```

### DELETE /api/templates/[id]

删除模板（级联删除所有任务）。

**权限**: canCRUD = true

**响应**:
```typescript
// 200 OK
{ data: { message: "模板已删除" } }

// 404 Not Found
{ error: "模板不存在" }
```

### PATCH /api/templates/reorder

批量更新模板排序。

**权限**: canCRUD = true

**请求**:
```typescript
{
  orders: Array<{ id: string, order: number }>
}
```

**响应**:
```typescript
// 200 OK
{ data: { message: "排序已更新" } }
```

---

## 4. 任务 API

### POST /api/tasks

创建新任务。

**权限**: canCRUD = true

**请求**:
```typescript
{
  templateId: string
  images?: string[]
  copyTexts?: string[]
  notes?: string
  publishDate?: string  // ISO 日期
  exposure?: number
  registrations?: number
  profit?: number
}
```

**响应**:
```typescript
// 201 Created
{ data: { id: string, templateId: string, ... } }

// 404 Not Found
{ error: "模板不存在" }
```

### PATCH /api/tasks/[id]

更新任务。

**权限**: canCRUD = true（部分字段），canApprove = true（isApproved 字段）

**请求**:
```typescript
{
  images?: string[]
  copyTexts?: string[]
  notes?: string
  isApproved?: boolean  // 需要 canApprove 权限
  claimCreator?: boolean  // true 时设置当前用户为制作人
  publishDate?: string
  exposure?: number
  registrations?: number
  profit?: number
  order?: number
}
```

**响应**:
```typescript
// 200 OK
{ data: { id: string, ... } }

// 403 Forbidden
{ error: "无 CRUD 权限" }
{ error: "无批准权限" }

// 404 Not Found
{ error: "任务不存在" }
```

### DELETE /api/tasks/[id]

删除任务。

**权限**: canCRUD = true

**响应**:
```typescript
// 200 OK
{ data: { message: "任务已删除" } }

// 404 Not Found
{ error: "任务不存在" }
```

### PATCH /api/tasks/reorder

批量更新任务排序（同一模板内）。

**权限**: canCRUD = true

**请求**:
```typescript
{
  templateId: string
  orders: Array<{ id: string, order: number }>
}
```

**响应**:
```typescript
// 200 OK
{ data: { message: "排序已更新" } }
```

---

## 5. 上传 API

### POST /api/upload

上传图片到 Vercel Blob。

**权限**: canCRUD = true

**请求**: `multipart/form-data`
- `file`: 图片文件（JPEG, PNG, GIF, WebP，最大 5MB）

**响应**:
```typescript
// 200 OK
{
  data: {
    url: string       // Blob URL
    pathname: string  // 文件路径
  }
}

// 400 Bad Request
{ error: "无效的文件类型" }
{ error: "文件大小超过 5MB" }

// 403 Forbidden
{ error: "无 CRUD 权限" }
```

### DELETE /api/upload

删除 Blob 中的图片。

**权限**: canCRUD = true

**请求**:
```typescript
{
  url: string  // 要删除的 Blob URL
}
```

**响应**:
```typescript
// 200 OK
{ data: { message: "图片已删除" } }
```

---

## 错误码

| HTTP 状态 | 含义 |
|----------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## TypeScript 类型定义

```typescript
// src/types/api.ts

export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  canCRUD: boolean
  canApprove: boolean
  createdAt: string
}

export interface Template {
  id: string
  name: string
  images: string[]
  copyTexts: string[]
  order: number
  tasks: Task[]
}

export interface Task {
  id: string
  templateId: string
  images: string[]
  copyTexts: string[]
  notes: string
  isApproved: boolean
  creator: Pick<User, 'id' | 'username'> | null
  publishDate: string | null
  exposure: number
  registrations: number
  profit: number
  order: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  code?: string
}
```
