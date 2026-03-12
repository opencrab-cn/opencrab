# 测试文件修正说明

## 🐛 发现的问题

### 问题 1: 测试文件路径错误 ❌

**错误信息:**
```
src/main/ipc/__tests__/handlers.test.ts(24,53): error TS2307: 
Cannot find module '../../main/ipc/auth.handlers'
```

**原因:**
- 测试文件位于 `src/main/ipc/__tests__/`
- 应该引用同级目录的处理器：`../auth.handlers`
- 错误地使用了：`../../main/ipc/auth.handlers`（多了一层路径）

**已修复:** ✅
```typescript
// ❌ 错误的
import('../../main/ipc/auth.handlers')

// ✅ 正确的
import('../auth.handlers')
```

---

### 问题 2: Jest Matcher 类型错误 ❌

**错误信息:**
```
Property 'string' does not exist on type 'Expect'.
```

**原因:**
- 使用了错误的 Jest matcher: `expect.string()`
- 正确的应该是：`expect.any(String)`

**已修复:** ✅
```typescript
// ❌ 错误的
modelId: expect.string(),
displayName: expect.string()

// ✅ 正确的
modelId: expect.any(String),
displayName: expect.any(String)
```

---

### 问题 3: 测试文件被 TypeScript 编译检查 ❌

**问题:**
- `npm run dev` 时，主进程 TypeScript 编译会检查所有 `.ts` 文件
- 包括测试文件 (`__tests__/*.test.ts`)
- 导致编译失败，应用无法启动

**解决方案:** ✅

修改 `tsconfig.main.json`:
```json
{
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"],
  "exclude": [
    "node_modules",
    "src/main/**/*.test.ts",
    "src/main/**/__tests__/**/*.ts"
  ]
}
```

修改 `tsconfig.renderer.json`:
```json
{
  "include": ["src/renderer/**/*"],
  "exclude": [
    "node_modules",
    "src/renderer/**/*.test.ts",
    "src/renderer/**/*.test.tsx",
    "src/renderer/**/__tests__/**/*.ts",
    "src/renderer/**/__tests__/**/*.tsx"
  ]
}
```

---

## ✅ 修复后的效果

### 开发模式
```bash
npm run dev
```

**预期输出:**
```
[0] VITE v5.4.21  ready in 1147 ms
[0] ➜  Local:   http://localhost:5173/
[1] [Main] Electron 应用已就绪
```

✅ **不再有 TypeScript 编译错误**
✅ **应用正常启动**
✅ **DevTools 自动打开**

---

## 🧪 运行测试

### 单独运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx jest src/main/ipc/__tests__/handlers.test.ts

# 监听模式
npm run test:watch
```

### 测试配置说明

**Jest 配置** (`jest.config.js`):
- 使用 `ts-jest` 处理 TypeScript
- 使用 `jsdom` 环境
- 自动 Mock CSS 模块和静态资源

**TypeScript 配置** (`tests/tsconfig.json`):
- 专门为测试文件配置
- 包含 Jest 类型定义
- 允许 JSX (react-jsx)

---

## 📝 最佳实践

### 1. 测试文件命名
```typescript
// ✅ 好的做法
src/main/ipc/__tests__/handlers.test.ts
src/renderer/hooks/__tests__/useAuth.test.ts

// ❌ 不好的做法
src/main/ipc/test-handlers.ts
```

### 2. 路径引用
```typescript
// ✅ 相对路径（测试文件内）
import '../auth.handlers'
import './auth.handlers'

// ❌ 绝对路径或错误路径
import '../../main/ipc/auth.handlers' // 除非配置了路径别名
```

### 3. Jest Matchers
```typescript
// ✅ 正确的
expect.any(String)
expect.any(Number)
expect.any(Function)
expect.objectContaining({...})
expect.arrayContaining([...])

// ❌ 错误的
expect.string()
expect.number()
```

### 4. 排除测试文件
```json
// tsconfig.json
{
  "exclude": [
    "**/*.test.ts",
    "**/__tests__/**"
  ]
}
```

---

## 🔍 故障排查

### 如果还有 TypeScript 错误

**检查点:**
1. 测试文件是否在 `__tests__` 目录内？
2. 文件名是否以 `.test.ts` 或 `.spec.ts` 结尾？
3. tsconfig 的 exclude 是否包含测试文件？

**解决方案:**
```bash
# 清理并重新编译
rm -rf dist/
npm run build
```

### 如果测试导入失败

**检查路径:**
```bash
# 查看文件结构
tree src/main/ipc/
# 或
find src/main/ipc -name "*.test.ts"
```

**验证导入:**
```typescript
// 从测试文件到源文件的相对路径应该是
// src/main/ipc/__tests__/handlers.test.ts
// ↓
// src/main/ipc/auth.handlers.ts
// = ../auth.handlers
```

---

## 📚 相关文档

- [Jest Matchers](https://jestjs.io/docs/expect)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Testing Library](https://testing-library.com/)

---

**修复时间:** 2026-03-12  
**状态:** ✅ 已完成  
**影响:** 开发模式可正常启动，测试文件不再干扰编译
