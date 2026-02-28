# 投放效果数据导入 API 文档

## 接口信息

- **URL**: `POST https://ai-video-task-track.vercel.app/api/import/metrics`
- **Content-Type**: `application/json`
- **功能**: 接收 Remix 成片的分天投放效果数据，匹配 `ocean_video_ids` → 任务素材ID，写入每日指标

---

## 认证

通过请求头 `x-api-key` 传递 API Key：

```
x-api-key: <your-api-key>
```

---

## 请求体

```json
{
  "sync_time": "2026-02-28T15:30:00",
  "videos": [
    {
      "video_id": 12187,
      "ocean_video_ids": ["7606309543139917867"],
      "daily": [
        {
          "date": "2026-02-27",
          "cost": 4443.41,
          "roi": 2.1,
          "impressions": 44317,
          "cpm": 100.27,
          "clicks": 1232,
          "ctr": 2.78,
          "cpc": 3.61,
          "conversions": 20,
          "cvr": 1.62,
          "cpa": 222.17
        }
      ]
    }
  ]
}
```

### 字段说明

#### 顶层

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sync_time` | string | 否 | 推送时间 ISO 8601（仅记录，不处理） |
| `videos` | array | **是** | 视频数据数组 |

#### videos[n]

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `video_id` | int | 否 | 成片ID（仅记录，不用于匹配） |
| `ocean_video_ids` | string[] | **是** | 巨量引擎视频ID，用于匹配任务的素材ID |
| `daily` | array | **是** | 分天投放数据 |

#### daily[n]

| 字段 | 类型 | 说明 | 对应存储字段 |
|------|------|------|-------------|
| `date` | string | 日期 YYYY-MM-DD | date |
| `cost` | float | 消耗（元） | cost |
| `roi` | float | ROI | roi |
| `impressions` | int | 展示数 | impressions |
| `cpm` | float | 千次展示费用（元） | cpm |
| `clicks` | int | 点击数 | clicks |
| `ctr` | float | 点击率（%） | clickRate |
| `cpc` | float | 点击单价（元） | 不存储（可算） |
| `conversions` | int | 转化数 | conversions |
| `cvr` | float | 转化率（%） | 不存储（可算） |
| `cpa` | float | 转化成本（元） | conversionCost |

---

## 匹配逻辑

`ocean_video_ids` 中的每个 ID 会与系统中任务的 `materialId` 进行匹配。一个视频可能匹配多个任务（如同一素材ID被多个任务引用）。

已存在相同任务+日期的记录会被更新（upsert）。

---

## 响应

### 成功（200）

```json
{
  "success": true,
  "message": "成功接收 9 个视频的投放数据",
  "matched": 9,
  "unmatched": 2,
  "metrics_upserted": 27
}
```

| 字段 | 说明 |
|------|------|
| `matched` | 成功匹配到任务的视频数 |
| `unmatched` | 未匹配到任务的视频数 |
| `metrics_upserted` | 写入/更新的指标记录条数 |

### 失败

| 状态码 | 说明 |
|--------|------|
| 400 | `{"error": "数据格式错误，videos 不能为空"}` |
| 401 | `{"error": "未授权，请提供有效的 x-api-key 或登录"}` |
| 500 | `{"error": "服务器错误"}` |

---

## 调用示例

### Python

```python
import requests

resp = requests.post(
    "https://ai-video-task-track.vercel.app/api/import/metrics",
    headers={
        "x-api-key": "<your-api-key>",
        "Content-Type": "application/json",
    },
    json={
        "sync_time": "2026-02-28T15:30:00",
        "videos": [
            {
                "video_id": 12187,
                "ocean_video_ids": ["7606309543139917867"],
                "daily": [
                    {
                        "date": "2026-02-27",
                        "cost": 4443.41,
                        "roi": 2.1,
                        "impressions": 44317,
                        "cpm": 100.27,
                        "clicks": 1232,
                        "ctr": 2.78,
                        "conversions": 20,
                        "cpa": 222.17,
                    }
                ],
            }
        ],
    },
)
print(resp.json())
```

### cURL

```bash
curl -X POST https://ai-video-task-track.vercel.app/api/import/metrics \
  -H "x-api-key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "sync_time": "2026-02-28T15:30:00",
    "videos": [{
      "video_id": 12187,
      "ocean_video_ids": ["7606309543139917867"],
      "daily": [{
        "date": "2026-02-27",
        "cost": 4443.41,
        "roi": 2.1,
        "impressions": 44317,
        "cpm": 100.27,
        "clicks": 1232,
        "ctr": 2.78,
        "conversions": 20,
        "cpa": 222.17
      }]
    }]
  }'
```
