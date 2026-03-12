# OpenCrab 测试指南

## 🧪 运行测试

### 安装测试依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 监听模式（自动重新运行）

```bash
npm run test:watch
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

### CI 环境测试

```bash
npm run test:ci
```

---

## 📁 测试文件组织

```
src/
├── renderer/
│   ├── components/
│   │   └── chat/
│   │       └── __tests__/
│   │           └── ChatWindow.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useAuth.test.ts
│   │       └── useChat.test.ts
│   └── pages/
│       └── __tests__/
│           └── ChatPage.test.tsx
└── main/
    ├── adapters/
    │   └── models/
    │       └── __tests__/
    │           └── qwen.adapter.test.ts
    ├── auth/
    │   └── providers/
    │       └── __tests__/
    │           └── aliyun.provider.test.ts
    └── ipc/
        └── __tests__/
            ├── auth.handlers.test.ts
            └── model.handlers.test.ts
tests/
├── __mocks__/
│   └── fileMock.js
├── setupTests.ts
└── tsconfig.json
```

---

## 📊 测试覆盖范围

### 单元测试

- ✅ **React Hooks**: `useAuth`, `useChat`
- ✅ **组件**: `ChatPage`, `ChatWindow`, `ModelSelector`
- ✅ **IPC Handlers**: 认证、模型调用
- ✅ **Model Adapters**: Qwen 适配器

### 集成测试

- ✅ OAuth 登录流程
- ✅ 模型调用流程
- ✅ 流式响应处理

---

## 🔍 调试测试

### 单个测试文件

```bash
npx jest src/renderer/hooks/__tests__/useAuth.test.ts
```

### 匹配测试名称

```bash
npx jest -t "应该处理登录成功"
```

### 显示详细输出

```bash
npx jest --verbose
```

---

## ⚠️ 常见问题

### 白屏问题排查

如果打开应用后是白屏，请检查：

1. **开发控制台**
   ```bash
   # 在开发模式下，DevTools 会自动打开
   # 查看 Console 和 Network 标签
   ```

2. **常见原因**
   - CSS 文件加载失败 → 检查路径
   - React 组件渲染错误 → 查看错误堆栈
   - IPC 调用失败 → 检查主进程是否启动
   - 路由配置错误 → 检查 App.tsx

3. **快速诊断命令**
   ```bash
   # 开发模式运行（带 DevTools）
   npm run dev
   
   # 查看构建产物
   ls dist/renderer/
   
   # 检查 TypeScript 编译
   npm run typecheck
   ```

---

## 📈 测试最佳实践

1. **Mock 外部依赖**
   - Electron IPC
   - 网络请求
   - 系统 API

2. **测试用户行为**
   - 点击按钮
   - 表单提交
   - 键盘操作

3. **测试边界情况**
   - 空数据
   - 错误处理
   - 加载状态

4. **保持测试独立**
   - 每个测试独立运行
   - 使用 beforeEach 清理状态
   - 避免测试间依赖

---

**最后更新:** 2026-03-12  
**维护者:** OpenCrab Team
