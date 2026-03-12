# OpenCrab 单元测试实现总结

## 📦 已完成的测试配置

### 1. 测试框架和依赖 ✅

已安装的依赖:
- `jest` - 测试运行器
- `ts-jest` - TypeScript 支持
- `@testing-library/react` - React 组件测试
- `@testing-library/jest-dom` - DOM 匹配器
- `@types/jest` - TypeScript 类型定义
- `jest-environment-jsdom` - JSDOM 环境
- `identity-obj-proxy` - CSS Modules mock

### 2. 配置文件 ✅

#### Jest 配置 (`jest.config.js`)
```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts']
}
```

#### TypeScript 配置 (`tests/tsconfig.json`)
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["node", "jest"],
    "esModuleInterop": true,
    "allowJs": true
  }
}
```

### 3. 测试文件 ✅

已创建的测试文件:

#### Renderer 层
1. **`src/renderer/pages/__tests__/ChatPage.test.tsx`**
   - 测试聊天页面的三种状态（加载中、未登录、已登录）
   - 测试用户交互（登录、登出、侧边栏切换）
   - Mock useAuth 和 ChatWindow 组件

2. **`src/renderer/hooks/__tests__/useAuth.test.ts`**
   - 测试认证 Hook 的 IPC 调用
   - 测试登录、登出、令牌刷新
   - 测试错误处理

#### Main 进程层
3. **`src/main/ipc/__tests__/handlers.test.ts`**
   - 测试 IPC 处理器注册
   - 测试认证和模型调用接口
   - Mock Electron API

### 4. 测试设置文件 ✅

- **`tests/setupTests.ts`** - 全局测试配置
  - Mock Electron API
  - 设置默认 IPC 行为
  - 配置超时和清理

- **`tests/__mocks__/fileMock.js`** - 静态资源 mock
  - Mock 图片、字体等文件

---

## 🚀 运行测试

### 基础命令

```bash
# 运行所有测试
npm test

# 监听模式（推荐开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# CI 环境测试
npm run test:ci
```

### 运行特定测试

```bash
# 运行单个测试文件
npx jest src/renderer/hooks/__tests__/useAuth.test.ts

# 运行匹配的测试
npx jest -t "应该处理登录成功"

# 显示详细输出
npx jest --verbose
```

---

## 📊 测试覆盖范围

### 已测试的功能

| 模块 | 测试文件 | 覆盖率 |
|------|---------|--------|
| ChatPage 组件 | `pages/__tests__/ChatPage.test.tsx` | ⏳ 待运行 |
| useAuth Hook | `hooks/__tests__/useAuth.test.ts` | ⏳ 待运行 |
| IPC Handlers | `ipc/__tests__/handlers.test.ts` | ⏳ 待运行 |

### 待添加的测试

1. **ChatWindow 组件**
   ```bash
   src/renderer/components/chat/__tests__/ChatWindow.test.tsx
   ```

2. **ModelSelector 组件**
   ```bash
   src/renderer/components/chat/__tests__/ModelSelector.test.tsx
   ```

3. **useChat Hook**
   ```bash
   src/renderer/hooks/__tests__/useChat.test.ts
   ```

4. **Qwen Adapter**
   ```bash
   src/main/adapters/models/__tests__/qwen.adapter.test.ts
   ```

5. **Aliyun Provider**
   ```bash
   src/main/auth/providers/__tests__/aliyun.provider.test.ts
   ```

---

## 🔧 白屏问题诊断

### 当前状态分析

根据代码审查，可能导致白屏的原因：

#### 1. CSS 导入路径 ✅ 已确认存在
```typescript
// src/renderer/main.tsx
import './styles/chat.css'; // ✅ 文件存在
```

#### 2. 组件渲染逻辑 ✅ 已确认正确
```typescript
// src/renderer/App.tsx
<Router>
  <Routes>
    <Route path="/" element={<Navigate to="/chat" replace />} />
    <Route path="/chat" element={<ChatPage />} />
  </Routes>
</Router>
```

#### 3. ChatPage 状态管理 ✅ 已确认完整
```typescript
// src/renderer/pages/ChatPage.tsx
const { isAuthenticated, isLoading: authLoading } = useAuth('aliyun');

// 三种状态都有对应的 UI
if (authLoading) return <Loading />;
if (!isAuthenticated) return <LoginPage />;
return <ChatWindow />;
```

### 最可能的原因

**Electron 主进程与渲染进程通信问题**

#### 诊断步骤：

1. **运行开发模式查看控制台**
   ```bash
   npm run dev
   ```
   
2. **检查 DevTools Console**
   - 查找红色错误信息
   - 特别注意 IPC 相关的错误
   
3. **检查 Network 标签**
   - 确认所有 JS/CSS 文件加载成功（状态码 200）
   - 查看是否有 404 或 500 错误

4. **验证主进程启动**
   ```bash
   # 检查主进程编译产物
   ls dist/main/electron.main.js
   ls dist/preload/index.js
   ```

### 快速修复方案

#### 方案 1: 重新编译并清理缓存
```bash
# 停止所有进程（Ctrl+C）

# 清理构建产物
rm -rf dist/ release/

# 清理 Vite 缓存
rm -rf node_modules/.vite

# 重新安装依赖（如果必要）
npm install

# 开发模式运行
npm run dev
```

#### 方案 2: 检查环境变量
```bash
# 创建 .env 文件（如果不存在）
cp .env.example .env

# 编辑 .env 填入配置
# ALIYUN_CLIENT_ID=your_id
# ALIYUN_CLIENT_SECRET=your_secret
```

#### 方案 3: 手动打开 DevTools
如果自动打开的 DevTools 被关闭了，可以在代码中强制打开：

```typescript
// src/main/electron.main.js
mainWindow.once('ready-to-show', () => {
  mainWindow?.show();
  mainWindow?.focus();
  
  // 强制打开 DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
});
```

---

## 📝 测试最佳实践

### 1. 编写可测试的代码

```typescript
// ✅ 好的做法：纯函数 + 依赖注入
export function useAuth(providerId: string) {
  const ipcRenderer = window.electron.ipcRenderer;
  // ... logic
}

// ❌ 不好的做法：硬编码依赖
export function useAuth() {
  const result = await fetch('http://localhost:3000/api');
  // ... logic
}
```

### 2. 使用有意义的测试名称

```typescript
// ✅ 清晰的测试名称
it('应该处理登录成功并保存令牌', async () => {
  // ... test code
});

// ❌ 模糊的测试名称
it('should work', () => {
  // ... test code
});
```

### 3. 保持测试独立

```typescript
// ✅ 每个测试独立
beforeEach(() => {
  jest.clearAllMocks();
});

it('测试 1', () => {
  // ... independent test
});

it('测试 2', () => {
  // ... independent test
});
```

### 4. 测试用户行为而非实现

```typescript
// ✅ 测试用户看到的
expect(screen.getByText('登录')).toBeInTheDocument();

// ❌ 测试内部实现
expect(component.state.isAuthenticated).toBe(true);
```

---

## 🎯 下一步行动

### 立即执行

1. **运行测试验证配置**
   ```bash
   npm test -- --passWithNoTests
   ```

2. **开发模式运行应用**
   ```bash
   npm run dev
   ```

3. **查看控制台错误**
   - 打开 DevTools
   - 查看 Console 和 Network 标签

### 短期改进

1. **添加更多测试用例**
   - ChatWindow 测试
   - MessageList 测试
   - useChat Hook 测试

2. **提高覆盖率**
   ```bash
   npm run test:coverage
   # 目标：> 70%
   ```

3. **集成 CI/CD**
   ```yaml
   # .github/workflows/test.yml
   - name: Run tests
     run: npm run test:ci
   ```

### 长期维护

1. **定期运行测试**
   - 每次提交前运行测试
   - PR 必须通过所有测试

2. **维护测试文档**
   - 更新 TESTING.md
   - 记录常见问题

---

## 📚 相关文档

- [测试指南](../TESTING.md) - 如何运行测试
- [故障排查](./TROUBLESHOOTING.md) - 白屏问题解决
- [Jest 官方文档](https://jestjs.io/)
- [Testing Library 文档](https://testing-library.com/)

---

**创建时间:** 2026-03-12  
**作者:** AI Assistant  
**状态:** ✅ 测试框架已配置完成
