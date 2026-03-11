# OpenCrab 快速参考手册

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env（OAuth 流程通常不需要手动配置）
```

### 3. 运行开发环境
```bash
npm run dev
```

---

## 📡 IPC 通道一览

### 认证相关
| 通道 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `auth:login` | `providerId: string` | `{ success, token }` | 执行 OAuth 登录 |
| `auth:logout` | `providerId: string` | `{ success }` | 登出并撤销 Token |
| `auth:getStatus` | `providerId: string` | `{ success, status }` | 获取认证状态 |
| `auth:refreshToken` | `providerId: string` | `{ success, token }` | 刷新 Token |
| `auth:getUserInfo` | `providerId: string` | `{ success, userInfo }` | 获取用户信息 |

### 模型相关
| 通道 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `model:list` | 无 | `{ success, models }` | 获取可用模型列表 |
| `model:chat` | `{ messages, modelId, options }` | `{ success, response }` | 非流式对话 |
| `model:stream` | `{ messages, modelId, options }` | `{ success }` | 流式对话 |
| `model:validateToken` | `modelId: string` | `{ success, isValid }` | 验证 Token |
| `model:getCapabilities` | `modelId: string` | `{ success, capabilities }` | 获取模型能力 |

### 事件监听
| 事件 | 回调数据 | 说明 |
|------|----------|------|
| `model:stream-chunk` | `{ sessionId, type, content }` | 流式响应更新 |
| `model:stream-error` | `{ type, message }` | 流式调用错误 |

---

## 🎣 React Hooks API

### useAuth

```typescript
import { useAuth } from './hooks/useAuth';

const {
  isAuthenticated,  // boolean
  user,            // UserInfo | null
  isLoading,       // boolean
  error,          // string | null
  login,          // (providerId) => Promise<void>
  logout,         // (providerId) => Promise<void>
  refreshToken,   // (providerId) => Promise<void>
  checkStatus,    // () => Promise<void>
} = useAuth('aliyun');
```

### useChat

```typescript
import { useChat } from './hooks/useChat';

const {
  messages,        // ChatMessageItem[]
  isLoading,      // boolean
  error,         // string | null
  usage,         // TokenUsage
  sendMessage,   // (content, options?) => Promise<void>
  clearError,    // () => void
  clearMessages, // () => void
  regenerate,    // (options?) => Promise<void>
  stopGeneration,// () => void
} = useChat('qwen-max');
```

**sendMessage 选项：**
```typescript
{
  modelId?: string;           // 默认当前选中的模型
  chatOptions?: QwenChatOptions;
  stream?: boolean;           // 默认 true
}
```

---

## 💬 Qwen 模型参数

### 基础参数
```typescript
interface QwenChatOptions {
  temperature?: number;        // 0-2, 默认 1.0
  top_p?: number;             // 0-1, 默认 0.8
  top_k?: number;             // 可选
  maxTokens?: number;         // 默认 2000
  repetition_penalty?: number;// 1.0-2.0, 默认 1.1
  stop?: string[];            // 停止词列表
  stream?: boolean;           // 默认 true
}
```

### 参数调优建议

| 场景 | temperature | top_p | top_k | 说明 |
|------|-----------|-------|-------|------|
| 代码生成 | 0.1-0.3 | 0.5 | 40 | 降低随机性，提高准确性 |
| 创意写作 | 0.8-1.2 | 0.9 | - | 增加创造性 |
| 客服对话 | 0.7-0.9 | 0.8 | - | 平衡稳定与灵活 |
| 逻辑推理 | 0.2-0.5 | 0.6 | 20 | 严谨推理 |
| 翻译 | 0.3-0.5 | 0.7 | 30 | 准确传达原意 |

---

## 🗂️ 项目结构

```
opencrab/
├── src/
│   ├── main/                    # 主进程
│   │   ├── auth/               # OAuth 认证
│   │   │   ├── providers/      # OAuth 提供商实现
│   │   │   └── provider.interface.ts
│   │   ├── adapters/           # 模型适配器
│   │   │   ├── models/         # 具体模型实现
│   │   │   └── model.interface.ts
│   │   ├── ipc/                # IPC 处理器
│   │   │   ├── auth.handlers.ts
│   │   │   ├── model.handlers.ts
│   │   │   └── ipc.handlers.ts
│   │   ├── utils/              # 工具函数
│   │   └── electron.main.ts    # 主进程入口
│   │
│   ├── renderer/               # 渲染进程
│   │   ├── components/         # UI 组件
│   │   ├── hooks/              # React Hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useChat.ts
│   │   ├── stores/             # Zustand 状态
│   │   └── types/              # 类型定义
│   │       └── electron.d.ts
│   │
│   └── shared/                 # 共享代码
│       └── types.ts            # 通用类型
│
├── docs/                       # 文档
│   ├── qwen-setup-guide.md
│   └── qwen-implementation-summary.md
│
├── .env.example               # 环境变量模板
├── package.json
└── tsconfig.json
```

---

## 🔧 常用命令

```bash
# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 代码 lint
npm run lint

# 构建生产版本
npm run build

# 打包应用
npm run dist
```

---

## 🐛 调试技巧

### 查看日志

**主进程日志：**
```javascript
// 在开发者工具控制台看不到，需要查看终端输出
console.log('[Main] 消息');
```

**渲染进程日志：**
```javascript
// 在 Electron 开发者工具控制台
console.log('[Renderer] 消息');
```

### 测试连接

```javascript
// 1. 检查认证状态
await window.electron.ipcRenderer.invoke('auth:getStatus', 'aliyun');

// 2. 获取模型列表
await window.electron.ipcRenderer.invoke('model:list');

// 3. 简单对话测试
await window.electron.ipcRenderer.invoke('model:chat', {
  messages: [{ role: 'user', content: '你好' }],
  modelId: 'qwen-turbo'
});
```

### 常见错误码

| 错误类型 | HTTP 状态码 | 解决方案 |
|---------|-----------|---------|
| auth | 401, 403 | 重新登录 |
| rate_limit | 429 | 降低频率或升级套餐 |
| network | - | 检查网络连接 |
| model_error | 4xx | 检查请求参数 |

---

## 📦 依赖说明

### 核心依赖
- `electron` ^28.1.0 - 桌面应用框架
- `react` ^18.2.0 - UI 库
- `zustand` ^4.5.0 - 状态管理
- `axios` ^1.6.5 - HTTP 客户端
- `keytar` ^7.9.0 - 密钥存储

### 开发依赖
- `typescript` ^5.3.3 - 类型系统
- `vite` ^5.0.11 - 构建工具
- `electron-builder` ^24.9.1 - 打包工具

---

## 🌐 支持的模型

### 阿里云通义千问
| 模型 | 上下文 | 视觉 | 音频 | 状态 |
|------|-------|------|------|------|
| qwen-max | 6K | ❌ | ❌ | ✅ 已实现 |
| qwen-plus | 32K | ❌ | ❌ | ✅ 已实现 |
| qwen-turbo | 6K | ❌ | ❌ | ✅ 已实现 |
| qwen-vl-max | 8K | ✅ | ❌ | 🔄 待测试 |

### 计划支持
- 百度文心一言
- 科大讯飞星火
- MiniMax
- Moonshot（月之暗面）

---

## 🔐 安全最佳实践

### ✅ 推荐做法
1. 使用 OAuth2.0 + PKCE
2. Token 存储在 keytar（系统钥匙串）
3. IPC 通道白名单验证
4. 严格的 TypeScript 类型检查
5. 敏感操作在主进程执行

### ❌ 禁止做法
1. 硬编码 API Key 或 Secret
2. 在渲染进程直接调用 Node.js API
3. 禁用 contextIsolation
4. 启用 nodeIntegration
5. 未验证的 IPC 通道

---

## 📞 获取帮助

### 文档
- [配置指南](docs/qwen-setup-guide.md)
- [实现总结](docs/qwen-implementation-summary.md)

### 外部资源
- [Electron 官方文档](https://www.electronjs.org/)
- [阿里云百炼文档](https://help.aliyun.com/zh/model-studio/)
- [通义千问 API](https://help.aliyun.com/zh/dashscope/)

### 社区
- GitHub Issues: 提交 Bug 和功能请求
- 开发者交流群：（待添加）

---

## 🎯 快速检查清单

在提交代码或发布前检查：

- [ ] TypeScript 类型检查通过 (`npm run typecheck`)
- [ ] ESLint 检查通过 (`npm run lint`)
- [ ] OAuth 登录流程正常
- [ ] 文本对话功能正常（流式 + 非流式）
- [ ] 错误处理完整
- [ ] Token 自动刷新正常
- [ ] 内存无泄漏（长时间运行测试）
- [ ] 跨平台测试（Windows/Mac/Linux）

---

**最后更新:** 2026-03-11  
**版本:** v0.1.0
