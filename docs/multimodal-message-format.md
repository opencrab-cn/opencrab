# Qwen-VL 多模态消息格式示例

## 📋 API 格式说明

阿里云通义千问 VL（Vision-Language）模型支持多模态输入，包括文本、图像和音频。

### 基础消息结构

```typescript
interface MultimodalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentItem[];
}

interface ContentItem {
  type: 'text' | 'image' | 'audio';
  text?: string;
  image?: string;  // URL 或 Base64
  audio?: string;  // URL 或 Base64
}
```

---

## 💬 使用示例

### 示例 1: 纯文本消息

```json
{
  "role": "user",
  "content": "你好，请介绍一下你自己"
}
```

---

### 示例 2: 文本 + 单张图片

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "这张图片里有什么？"
    },
    {
      "type": "image",
      "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

---

### 示例 3: 文本 + 多张图片

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "比较这两张图片的区别"
    },
    {
      "type": "image",
      "image": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "type": "image",
      "image": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

---

### 示例 4: 文本 + 图片 + 音频（全模态）

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "请根据这张图片和录音描述场景"
    },
    {
      "type": "image",
      "image": "https://example.com/image.jpg"
    },
    {
      "type": "audio",
      "audio": "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMA..."
    }
  ]
}
```

---

### 示例 5: 多轮对话历史

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "这张照片是在哪里拍的？"
      },
      {
        "type": "image",
        "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      }
    ]
  },
  {
    "role": "assistant",
    "content": "这张照片看起来是在一个公园拍摄的，可以看到..."
  },
  {
    "role": "user",
    "content": "天气怎么样？"
  }
]
```

---

## 🔧 OpenCrab 实现方式

### 1. 构建多模态消息

```typescript
import { buildMultimodalMessage } from '../utils/mediaProcessor';
import { AnyAttachment } from '../shared/types/attachments';

// 用户输入
const text = "分析这张图片";

// 附件列表（从 AttachmentBar 获取）
const attachments: AnyAttachment[] = [
  {
    id: "1234567890_image",
    type: "image",
    data: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    processedData: "data:image/jpeg;base64,/9j/4AAQSkZJRg...（压缩后）",
    // ... 其他属性
  }
];

// 构建消息
const message = buildMultimodalMessage(text, attachments);

// 输出：
// {
//   role: "user",
//   content: [
//     { type: "text", text: "分析这张图片" },
//     { type: "image", image: "data:image/jpeg;base64,..." }
//   ]
// }
```

---

### 2. 发送到模型

```typescript
// useChat Hook 中
const sendMessage = async (content: string, options: SendMessageOptions) => {
  const { attachments = [] } = options;
  
  let apiMessages: ChatMessage[];
  
  if (attachments.length > 0) {
    // 多模态消息格式
    const lastUserMessage = buildMultimodalMessage(content, attachments);
    const previousMessages = convertToApiMessages(messagesRef.current);
    apiMessages = [...previousMessages, lastUserMessage];
  } else {
    // 纯文本消息
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
    };
    const previousMessages = convertToApiMessages(messagesRef.current);
    apiMessages = [...previousMessages, userMessage];
  }
  
  // 调用 IPC 发送
  await window.electron.ipcRenderer.invoke('model:chat', {
    messages: apiMessages,
    modelId: 'qwen-vl-max',  // 视觉模型
    options: chatOptions,
  });
};
```

---

### 3. Qwen Adapter 处理

```typescript
// qwen.adapter.ts
async chat(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
  apiKey?: string
): Promise<ChatCompletionResponse> {
  // 转换消息格式为 Qwen API 格式
  const qwenMessages: QwenMessage[] = messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' 
      ? msg.content 
      : this.convertContentArray(msg.content),  // 多模态内容
  }));
  
  // 发送请求
  const response = await axios.post<QwenResponse>(
    this.endpoint,
    {
      model: this.modelId,
      input: { messages: qwenMessages },
      parameters: { /* ... */ }
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );
  
  return this.parseResponse(response.data);
}

// 转换多模态内容数组
private convertContentArray(content: any[]): Array<{ text?: string; image?: string }> {
  return content.map(item => {
    if (item.type === 'text') {
      return { text: item.text };
    } else if (item.type === 'image') {
      return { image: item.image };
    } else if (item.type === 'audio') {
      return { audio: item.audio };
    }
    return { text: JSON.stringify(item) };
  });
}
```

---

## 📊 数据流转

```
用户操作
  ↓
[AttachmentBar] 选择图片/录制音频
  ↓
[mediaProcessor] 创建 Attachment 对象
  ↓
[mediaProcessor] 压缩/转码（可选）
  ↓
[useChat] sendMessage({ attachments })
  ↓
[mediaProcessor] buildMultimodalMessage()
  ↓
[IPC] model:chat (多模态消息)
  ↓
[Main Process] qwen.adapter.ts
  ↓
[Qwen API] POST /generation
  ↓
[Stream Response] 流式返回
```

---

## 🎯 支持的模型

| 模型 ID | 支持图片 | 支持音频 | 最大图片数 | 上下文长度 |
|--------|---------|---------|-----------|-----------|
| `qwen-max` | ❌ | ❌ | - | 6K |
| `qwen-plus` | ❌ | ❌ | - | 32K |
| `qwen-turbo` | ❌ | ❌ | - | 6K |
| `qwen-vl-max` | ✅ | ✅ | 25 | 8K |
| `qwen-vl-plus` | ✅ | ❌ | 25 | 8K |

**注意：** 只有 `qwen-vl-*` 系列模型支持多模态输入

---

## 🛠️ 最佳实践

### 1. 图片处理

```typescript
// 压缩配置
const options: MediaProcessingOptions = {
  maxImageSize: 1024,  // 最大边长
  imageQuality: 80,     // 质量 80%
  compressImage: true,
};

// 压缩后大小估算
// 原始：5MB → 压缩后：~500KB-1MB
```

### 2. 音频处理

```typescript
// 录制配置
const maxDuration = 300;  // 最长 5 分钟
const mimeType = 'audio/webm;codecs=opus';

// 转码（主进程中使用 ffmpeg）
// WebM → MP3, 16kbps
```

### 3. 错误处理

```typescript
try {
  const attachment = await createAttachment(file, 'image');
  
  if (attachment.size > FILE_SIZE_LIMITS.image) {
    throw new Error('图片超过 5MB 限制');
  }
} catch (error) {
  console.error('处理失败:', error);
  // 显示友好错误提示
}
```

---

## 📝 注意事项

1. **Base64 格式要求**
   - 必须包含前缀：`data:image/jpeg;base64,`
   - 仅包含有效的 Base64 字符
   - 避免换行符

2. **URL 格式要求**
   - 必须是公开可访问的 HTTPS URL
   - 不支持本地文件路径
   - 建议使用稳定的 CDN

3. **性能优化**
   - 图片压缩在渲染进程使用 Canvas
   - 后续迁移到主进程使用 sharp 提升性能
   - 大文件分片处理

4. **安全考虑**
   - 前端校验文件大小
   - 后端二次校验
   - 限制单次请求的图片数量（≤ 25 张）

---

## 🔗 相关文档

- [阿里云百炼官方文档](https://help.aliyun.com/zh/model-studio/)
- [通义千问 VL API](https://help.aliyun.com/zh/dashscope/developer-reference/multimodal-api)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

**最后更新:** 2026-03-11  
**版本:** v0.1.0
