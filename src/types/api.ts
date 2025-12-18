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
  videoUrl: string | null
  notes: string
  order: number
  tasks: Task[]
}

export interface DailyMetrics {
  id: string
  taskId: string
  date: string // ISO date string (YYYY-MM-DD)
  cost: number // 消耗
  impressions: number // 展示数
  clicks: number // 点击数
  clickRate: number // 点击率(%)
  cpm: number // 平均千次展现费用(元)
  conversions: number // 转化数
  conversionCost: number // 转化成本
  activations: number // 激活数
  dailyPayment: number // 计费当日付费金额
  materialScore: number // 素材评估
}

// 重要指标汇总（显示在界面上）
export interface MetricsSummary {
  totalCost: number // 消耗
  totalImpressions: number // 展示数
  avgClickRate: number // 点击率(%)
  avgCpm: number // 平均千次展现费用(元)
  totalConversions: number // 转化数
  totalActivations: number // 激活数
  totalDailyPayment: number // 计费当日付费金额
  avgMaterialScore: number // 素材评估
}

export interface Task {
  id: string
  templateId: string
  items: ContentItem[]
  videoUrl: string | null
  materialId: string
  notes: string
  feedback: string
  submitter: Pick<User, 'id' | 'username'> | null
  isApproved: boolean
  creator: Pick<User, 'id' | 'username'> | null
  order: number
  dailyMetrics?: DailyMetrics[]
  metricsSummary?: MetricsSummary
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
  videoUrl?: string | null
  order?: number
}

export interface CreateTaskRequest {
  templateId: string
  items?: ContentItem[]
  materialId?: string
  notes?: string
}

export interface UpdateTaskRequest {
  items?: ContentItem[]
  videoUrl?: string | null
  materialId?: string
  notes?: string
  feedback?: string
  isApproved?: boolean
  claimCreator?: boolean
  order?: number
}

export interface ImportCsvRequest {
  date: string // ISO date string (YYYY-MM-DD)
  data: Array<{
    materialId: string
    cost: number
    impressions: number
    clicks: number
    clickRate: number
    cpm: number
    conversions: number
    conversionCost: number
    activations: number
    dailyPayment: number
    materialScore: number
  }>
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
