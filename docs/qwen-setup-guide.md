# 通义千问模型配置指南

## 📋 阿里云百炼平台配置步骤

### 1. 开通服务

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 登录/注册阿里云账号
3. 进入「模型广场」→ 选择「通义千问」系列
4. 点击「开通服务」（首次使用需要开通）

### 2. 获取 API Key（OAuth Token）

> ⚠️ **重要说明**：OpenCrab 采用 OAuth 认证方式，**不使用传统的 API Key**

#### 方案 A：使用阿里云账号 OAuth（推荐）

1. 在百炼控制台进入「个人中心」→「Access Token 管理」
2. 创建新的 Access Token
3. 复制 Token 并在应用中配置

但 OpenCrab 实现了完整的 OAuth2.0 流程，用户只需：
- 点击登录按钮
- 跳转阿里云授权页面
- 授权后自动获取 Token
- Token 安全存储在系统钥匙串

#### 方案 B：RAM 用户认证（企业场景）

1. 创建 RAM 用户
2. 授予 `AliyunDashScopeFullAccess` 权限
3. 为 RAM 用户创建 AccessKey
4. 在应用中配置 OAuth 流程

### 3. 配置 Endpoint

通义千问各模型的 Endpoint 已在代码中预配置：

```typescript
// src/shared/types.ts
{
  modelId: 'qwen-max',
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
}
```

如需自定义（如使用 VPC 端点），可修改：
- `PREDEFINED_MODELS` 数组中的 `endpoint` 字段

### 4. 环境变量配置

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

虽然 OAuth 流程不需要手动配置 Token，但可以设置其他参数：

```env
# 可选：自定义 Endpoint
ALIYUN_DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com

# 可选：代理配置
HTTP_PROXY=http://your-proxy.com:8080
```

---

## 🔧 测试连接

### 方法 1：使用开发者工具

在渲染进程的开发者控制台中运行：

```javascript
// 检查认证状态
const status = await window.electron.ipcRenderer.invoke('auth:getStatus', 'aliyun');
console.log('认证状态:', status);

// 获取模型列表
const models = await window.electron.ipcRenderer.invoke('model:list');
console.log('可用模型:', models);

// 测试对话
const response = await window.electron.ipcRenderer.invoke('model:chat', {
  messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
  modelId: 'qwen-max',
  options: { temperature: 0.8 }
});
console.log('回复:', response);
```

### 方法 2：使用 React Hook

```tsx
import { useChat } from './hooks/useChat';

function TestComponent() {
  const { messages, sendMessage, isLoading } = useChat('qwen-max');

  const handleTest = async () => {
    try {
      await sendMessage('你好，很高兴认识你！');
    } catch (error) {
      console.error('发送失败:', error);
    }
  };

  return (
    <div>
      <button onClick={handleTest} disabled={isLoading}>
        测试对话
      </button>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

---

## 📊 支持的通义千问模型

| 模型 ID | 显示名称 | 上下文长度 | 特点 | 适用场景 |
|--------|---------|-----------|------|---------|
| `qwen-max` | 通义千问 Max | 6K tokens | 最强性能 | 复杂推理、代码生成 |
| `qwen-plus` | 通义千问 Plus | 32K tokens | 平衡性能与成本 | 长文档分析、多轮对话 |
| `qwen-turbo` | 通义千问 Turbo | 6K tokens | 快速响应、低成本 | 简单问答、实时交互 |
| `qwen-vl-max` | 通义千问 VL Max | 8K tokens | 视觉语言多模态 | 图像理解、图表分析 |

---

## 🔐 认证流程说明

### OAuth2.0 授权码流程

```
┌─────────────┐
│  用户点击登录 │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ 打开系统浏览器   │
│ 跳转授权页面     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  用户同意授权    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 回调本地服务器   │
│ 获取授权码       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ 授权码换 Token   │
│ (PKCE 增强安全)  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ keytar 加密存储 │
│ Token           │
└─────────────────┘
```

### Token 自动管理

- ✅ 自动检测过期
- ✅ 过期前 5 分钟自动刷新
- ✅ 刷新失败自动重试（最多 3 次）
- ✅ 完全不可用时提示重新登录

---

## 🛠️ 常见问题

### Q1: 「认证失败：OAuth Token 无效」

**解决方案：**
1. 检查是否已登录（调用 `auth:getStatus`）
2. 尝试登出后重新登录
3. 检查系统时间是否准确
4. 确认阿里云账号状态正常

### Q2: 「请求限流」

**解决方案：**
1. 降低请求频率
2. 升级到更高级别的模型套餐
3. 使用 `qwen-turbo` 替代 `qwen-max`

### Q3: 「网络错误」

**解决方案：**
1. 检查网络连接
2. 确认是否能访问 `dashscope.aliyuncs.com`
3. 如有防火墙，添加白名单
4. 考虑配置 HTTP 代理

### Q4: Token 存储在哪里？

**答案：** 使用 `keytar` 存储在系统钥匙串：
- **macOS:** Keychain
- **Windows:** Credential Manager
- **Linux:** libsecret (GNOME Keyring / KWallet)

路径：服务名 `opencrab-aliyun`，账户名 `aliyun-oauth`

---

## 📝 下一步

1. **完善 UI 组件**
   - 创建聊天界面
   - 添加模型选择器
   - 实现消息列表渲染

2. **多模态支持**
   - 图像上传功能
   - 语音输入集成
   - 文件解析能力

3. **高级特性**
   - 对话历史管理
   - 自定义 System Prompt
   - 预设角色模板

4. **性能优化**
   - 消息缓存
   - 流式渲染优化
   - 离线模式

---

## 🔗 相关链接

- [阿里云百炼官方文档](https://help.aliyun.com/zh/model-studio/)
- [通义千问 API 参考](https://help.aliyun.com/zh/dashscope/developer-reference/)
- [Electron 官方文档](https://www.electronjs.org/docs)
- [OpenCrab GitHub](https://github.com/opencrab/opencrab)

---

**提示：** 如果遇到任何问题，请查看开发者工具的控制台日志，或提交 Issue 到 GitHub 仓库。
