# 视频导入 API 文档

## 接口信息

- **URL**: `POST https://ai-video-task-track.vercel.app/api/import/video`
- **Content-Type**: `multipart/form-data`
- **功能**: 导入视频并自动创建模板

---

## 认证

通过请求头 `x-api-key` 传递 API Key：

```
x-api-key: <your-api-key>
```

> 如需获取 API Key，请联系管理员。

---

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | **是** | 模板名称 |
| `notes` | string | 否 | 备注信息 |
| `video` | file | 二选一 | 视频文件，支持 mp4/webm/mov/avi，最大 100MB |
| `videoUrl` | string | 二选一 | 视频链接（已有 URL 时直接传） |

> `video` 和 `videoUrl` 至少提供一个。如果传了视频文件，会自动上传到云存储。

---

## 响应

### 成功（201）

```json
{
  "success": true,
  "template": {
    "id": "cmm35jqsv000004jrtvp1jldh",
    "name": "模板名称",
    "notes": "备注信息",
    "videoUrl": "https://xxx.cos.ap-beijing.myqcloud.com/videos/2026-02-26/xxx.mp4"
  }
}
```

### 失败

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 400 | 参数错误 | `{"error": "模板名称(name)不能为空"}` |
| 400 | 缺少视频 | `{"error": "请提供视频文件(video)或视频链接(videoUrl)"}` |
| 400 | 格式不支持 | `{"error": "不支持的视频格式: xxx，支持 mp4/webm/mov/avi"}` |
| 400 | 文件过大 | `{"error": "视频大小不能超过 100MB"}` |
| 401 | 认证失败 | `{"error": "未授权，请提供有效的 x-api-key 或登录"}` |
| 500 | 服务器错误 | `{"error": "服务器错误"}` |

---

## 调用示例

### Python

```python
import requests

API_URL = "https://ai-video-task-track.vercel.app/api/import/video"
API_KEY = "<your-api-key>"

# 方式一：上传视频文件
resp = requests.post(API_URL,
    headers={"x-api-key": API_KEY},
    files={"video": open("video.mp4", "rb")},
    data={"name": "视频标题", "notes": "备注信息"}
)
print(resp.json())

# 方式二：传视频链接
resp = requests.post(API_URL,
    headers={"x-api-key": API_KEY},
    data={
        "name": "视频标题",
        "notes": "备注信息",
        "videoUrl": "https://example.com/video.mp4"
    }
)
print(resp.json())
```

### cURL

```bash
# 上传视频文件
curl -X POST https://ai-video-task-track.vercel.app/api/import/video \
  -H "x-api-key: <your-api-key>" \
  -F "name=视频标题" \
  -F "notes=备注信息" \
  -F "video=@/path/to/video.mp4"

# 传视频链接
curl -X POST https://ai-video-task-track.vercel.app/api/import/video \
  -H "x-api-key: <your-api-key>" \
  -F "name=视频标题" \
  -F "notes=备注信息" \
  -F "videoUrl=https://example.com/video.mp4"
```

### JavaScript / Node.js

```javascript
// 传视频链接
const formData = new FormData();
formData.append("name", "视频标题");
formData.append("notes", "备注信息");
formData.append("videoUrl", "https://example.com/video.mp4");

const resp = await fetch("https://ai-video-task-track.vercel.app/api/import/video", {
  method: "POST",
  headers: { "x-api-key": "<your-api-key>" },
  body: formData,
});
const data = await resp.json();
console.log(data);
```
