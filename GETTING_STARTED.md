# OpenCrab 快速启动指南

## 🚀 5 分钟快速开始

### 1️⃣ 安装依赖

```bash
npm install
```

**依赖说明：**
- Electron + TypeScript - 桌面应用框架
- React + Vite - 前端 UI
- Zustand - 状态管理
- keytar - 密钥存储
- markdown-it + highlight.js - Markdown 渲染
- react-router-dom - 路由管理

---

### 2️⃣ 配置环境变量（可选）

```bash
cp .env.example .env
```

编辑 `.env` 文件（OAuth 流程通常不需要手动配置）：

```env
# 阿里云 OAuth 配置（自动获取，无需填写）
ALIYUN_CLIENT_ID=
ALIYUN_CLIENT_SECRET=

NODE_ENV=development
```

---

### 3️⃣ 运行开发环境

```bash
npm run dev
```

**发生了什么：**
1. Vite 启动开发服务器（端口 5173）
2. Electron 主进程启动
3. 自动打开开发者工具

---

### 4️⃣ 测试功能

#### **登录流程**
1. 点击「使用阿里云账号登录」
2. 浏览器自动打开跳转到授权页面
3. 同意授权
4. 自动返回应用，登录成功

#### **发送消息**
1. 在输入框输入「你好」
2. 按 `Ctrl+Enter` 或点击发送按钮
3. AI 开始流式回复
4. 看到打字中动画和实时内容更新

#### **调节参数**
1. 点击模型选择器右侧的 ⚙️ 图标
2. 拖动滑块调节 Temperature/Top-p
3. 观察 AI 回复的变化

---

## 📁 项目结构

```
opencrab/
├── src/
│   ├── main/                    # 主进程（Electron）
│   │   ├── auth/               # OAuth 认证
│   │   │   ├── providers/      # OAuth 提供商实现
│   │   │   └── provider.interface.ts
│   │   ├── adapters/           # 模型适配器
│   │   │   ├── models/         # 具体模型实现
│   │   │   └── model.interface.ts
│   │   ├── ipc/                # IPC 处理器
│   │   │   ├── auth.handlers.ts
│   │   │   └── model.handlers.ts
│   │   └── electron.main.ts    # 主进程入口
│   │
│   ├── renderer/               # 渲染进程（React）
│   │   ├── components/chat/    # 聊天组件
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── ChatWindow.tsx
│   │   ├── pages/
│   │   │   └── ChatPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useChat.ts
│   │   ├── utils/
│   │   │   └── streamRenderer.ts
│   │   ├── styles/
│   │   │   └── chat.css
│   │   └── main.tsx            # 渲染进程入口
│   │
│   └── shared/                 # 共享代码
│       └── types.ts
│
├── docs/                       # 文档
│   ├── qwen-setup-guide.md
│   ├── qwen-implementation-summary.md
│   ├── chat-ui-summary.md
│   └── QUICK_REFERENCE.md
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎯 核心功能测试清单

### ✅ OAuth 认证
- [ ] 点击登录按钮能正常跳转
- [ ] 授权后能自动返回应用
- [ ] Token 能正确存储在系统钥匙串
- [ ] 刷新 Token 机制正常工作
- [ ] 登出功能正常

### ✅ 模型对话
- [ ] 能在下拉框中选择不同模型
- [ ] 发送消息能收到回复
- [ ] 流式响应显示正常
- [ ] Markdown 格式正确渲染
- [ ] 代码块有高亮效果

### ✅ UI 交互
- [ ] Ctrl+Enter 能发送消息
- [ ] Enter 能正常换行
- [ ] 侧边栏能折叠/展开
- [ ] 停止生成按钮有效
- [ ] 清空对话功能正常
- [ ] 重新生成功能正常

### ✅ 错误处理
- [ ] 网络断开时有友好提示
- [ ] Token 过期时提示重新登录
- [ ] 请求限流时显示相应错误
- [ ] 无效输入不会导致崩溃

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

# 打包应用（Windows/Mac/Linux）
npm run dist
```

---

## 🐛 常见问题

### Q1: 「keytar 安装失败」

**解决方案：**
```bash
# Linux
sudo apt-get install libsecret-1-dev

# macOS
xcode-select --install

# Windows
# 安装 Visual Studio Build Tools
```

### Q2: 「无法连接到阿里云」

**解决方案：**
1. 检查网络连接
2. 确认能访问 `dashscope.aliyuncs.com`
3. 如有防火墙，添加白名单
4. 考虑配置 HTTP 代理

### Q3: 「Markdown 渲染异常」

**解决方案：**
- 查看浏览器控制台错误信息
- 确认 `markdown-it` 和 `highlight.js` 已正确安装
- 检查是否有特殊字符导致解析失败

### Q4: 「流式响应不流畅」

**解决方案：**
- 检查网络连接稳定性
- 降低 `maxTokens` 参数值
- 确认防抖时间设置合理（默认 50ms）

---

## 📚 文档导航

### 新手必读
1. **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - 快速参考手册
2. **[qwen-setup-guide.md](docs/qwen-setup-guide.md)** - 阿里云配置指南
3. **[chat-ui-summary.md](docs/chat-ui-summary.md)** - UI 实现总结

### 进阶阅读
- **[qwen-implementation-summary.md](docs/qwen-implementation-summary.md)** - 模型适配器详解

---

## 🎨 自定义配置

### 修改主题色

编辑 `src/renderer/styles/chat.css`：

```css
.chat-page {
  /* 浅色主题 */
  --accent-color: #3b82f6;  /* 改成你喜欢的颜色 */
}
```

### 修改默认模型

编辑 `src/renderer/pages/ChatPage.tsx`：

```tsx
<ChatWindow initialModelId="qwen-plus" />  {/* 改成默认模型 */}
```

### 修改防抖时间

编辑 `src/renderer/utils/streamRenderer.ts`：

```typescript
setTimeout(() => {
  // ...
}, 50);  // 改成其他毫秒数
```

---

## 🆘 获取帮助

### 调试技巧

**查看主进程日志：**
```bash
# 在终端运行 npm run dev 查看输出
```

**查看渲染进程日志：**
```javascript
// 在开发者工具控制台
console.log('消息');
```

**测试 IPC 调用：**
```javascript
// 在开发者工具控制台运行
await window.electron.ipcRenderer.invoke('model:list');
```

### 提交 Issue

遇到问题请提交到 GitHub Issues，包含：
1. 操作系统版本
2. Node.js 版本
3. 错误信息（截图 + 文字）
4. 复现步骤

---

## 🎉 开始使用

一切准备就绪！现在你可以：

1. ✨ 体验流畅的 AI 对话
2. 🎛️ 调节模型参数获得最佳效果
3. 📝 使用 Markdown 格式化内容
4. 💻 查看代码高亮的示例
5. 🔄 随时重新生成回复

**祝你使用愉快！** 🦀

---

**最后更新:** 2026-03-11  
**版本:** v0.1.0
