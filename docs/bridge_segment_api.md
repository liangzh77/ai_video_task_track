# 桥段素材上传 API 文档（第三方对接）

## 基础信息

- **Base URL**: `http://82.157.178.120:9999/api/open`
- **认证方式**: 无需认证
- **内容格式**: `multipart/form-data`

---

## 上传桥段视频

**POST** `/videos/upload`

### 请求参数（multipart/form-data）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 视频文件（mp4 等），最大 1GB |
| tags | String | 否 | 标签，JSON 数组字符串，如 `["承接","cta"]` |
| category | String | 否 | 分类，如：前插、对口型、无口型运镜、尾帧、产品推广 |
| product_scope | String | 否 | 产品标签，默认 `universal`（通用）。可选值：xianban / qianyu / yidui / universal |
| industry | String | 否 | 行业 |
| scene | String | 否 | 使用场景 |
| source | String | 否 | 素材来源 |
| source_url | String | 否 | 原始链接 |
| notes | String | 否 | 备注 |
| created_by | String | 否 | 上传者名称，默认 `未知` |

### 请求示例

```bash
curl -X POST "http://<服务器IP>:9999/api/open/videos/upload" \
  -F "file=@/path/to/video.mp4" \
  -F 'tags=["承接","cta"]' \
  -F "category=前插" \
  -F "created_by=勇"
```

### Python 示例

```python
import requests
import json

url = "http://<服务器IP>:9999/api/open/videos/upload"

with open("video.mp4", "rb") as f:
    resp = requests.post(url, files={
        "file": ("video.mp4", f, "video/mp4")
    }, data={
        "tags": json.dumps(["承接", "cta"]),
        "category": "前插",
        "product_scope": "universal",
        "created_by": "勇"
    })

print(resp.json())
```

### 成功响应（201）

```json
{
  "success": true,
  "message": "视频上传成功",
  "data": {
    "id": 1441,
    "file_name": "video.mp4",
    "file_url": "https://xxx.cos.ap-beijing.myqcloud.com/videos/2026-03-11/xxx.mp4",
    "thumbnail_url": "https://xxx.cos.ap-beijing.myqcloud.com/thumbnails/2026-03-11/xxx.jpg",
    "tags": ["承接", "cta"],
    "category": "前插",
    "product_scope": "universal",
    "duration": 5.2,
    "duration_formatted": "5s",
    "width": 1080,
    "height": 1920,
    "resolution": "1080p",
    "file_size": 1234567,
    "size_formatted": "1.2 MB",
    "format": "mp4",
    "codec": "h264",
    "fps": 30,
    "created_at": "2026-03-11T15:58:21",
    "created_by": "勇"
  }
}
```

### 错误响应

| 状态码 | 说明 |
|--------|------|
| 400 | 未上传文件 / 文件名为空 / 标签格式错误 |
| 409 | 文件已存在（相同文件 hash） |
| 413 | 文件过大（超过 1GB） |
| 500 | 服务器内部错误 |

```json
{
  "success": false,
  "message": "标签格式错误，需要 JSON 数组字符串，如 [\"标签1\",\"标签2\"]"
}
```

---

## 说明

- 视频上传后自动提取元数据（时长、分辨率、编码等）并生成缩略图
- 视频文件和缩略图存储在腾讯云 COS，返回的 `file_url` 和 `thumbnail_url` 为 CDN 地址
- 相同文件（MD5 hash 相同）不会重复上传，会返回 409 冲突
- `tags` 参数必须是合法的 JSON 数组字符串，如 `["标签1","标签2"]`
