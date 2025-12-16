export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  canCRUD: boolean
  canApprove: boolean
  createdAt: string
}

export interface ContentItem {
  type: 'image' | 'text'
  content: string
}

export interface Template {
  id: string
  name: string
  items: ContentItem[]
  order: number
  tasks: Task[]
}

export interface Task {
  id: string
  templateId: string
  items: ContentItem[]
  materialId: string
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

export interface CreateTemplateRequest {
  name: string
  items?: ContentItem[]
}

export interface UpdateTemplateRequest {
  name?: string
  items?: ContentItem[]
  order?: number
}

export interface CreateTaskRequest {
  templateId: string
  items?: ContentItem[]
  materialId?: string
  notes?: string
  publishDate?: string
  exposure?: number
  registrations?: number
  profit?: number
}

export interface UpdateTaskRequest {
  items?: ContentItem[]
  materialId?: string
  notes?: string
  isApproved?: boolean
  claimCreator?: boolean
  publishDate?: string
  exposure?: number
  registrations?: number
  profit?: number
  order?: number
}

export interface UpdatePermissionsRequest {
  canCRUD?: boolean
  canApprove?: boolean
}

export interface ReorderRequest {
  orders: Array<{ id: string; order: number }>
}

export interface TaskReorderRequest extends ReorderRequest {
  templateId: string
}
