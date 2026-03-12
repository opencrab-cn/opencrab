# OpenCrab 单元测试快速参考

## 🚀 快速开始

### 运行所有测试
```bash
npm test
```

### 监听模式（推荐开发时使用）
```bash
npm run test:watch
```

### 查看测试覆盖率
```bash
npm run test:coverage
```

---

## 📁 测试文件位置

```
src/
├── __tests__/
│   └── basic.test.ts                      # 基础功能测试
├── main/
│   ├── auth/providers/__tests__/
│   │   └── aliyun.provider.test.ts        # OAuth 认证测试
│   └── plugins/__tests__/
│       └── PluginManager.test.ts          # 插件管理器测试
├── renderer/
│   └── utils/__tests__/
│       └── mediaProcessor.test.ts         # 媒体处理测试
└── shared/types/__tests__/
    ├── attachments.types.test.ts          # 附件类型测试
    └── plugins.test.ts                    # 插件类型测试
```

---

## 📊 测试统计速览

| 类别 | 数量 | 通过率 |
|------|------|--------|
| **测试套件** | 6 | ✅ 100% |
| **测试用例** | 65+ | ✅ 100% |
| **执行时间** | ~10s | ⚡ 快速 |

### 按模块分布
- 🔐 **OAuth 认证**: 11 tests
- 🔌 **插件系统**: 22 tests  
- 📎 **附件系统**: 32 tests
- 🔧 **基础功能**: 10 tests

---

## 🧪 常用测试命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx jest basic.test.ts
npx jest aliyun.provider.test.ts
npx jest PluginManager.test.ts

# 显示详细输出
npx jest --verbose

# 只运行失败的测试
npx jest --onlyFailures

# 更新快照（如果有）
npx jest -u
```

---

## 📝 编写新测试模板

### 基础测试模板

```typescript
// src/module/__tests__/feature.test.ts

describe('Feature Name', () => {
  beforeEach(() => {
    // 每个测试前的准备工作
    jest.clearAllMocks();
  });

  it('应该做某事', () => {
    // Arrange - 准备数据
    const input = 'test';
    
    // Act - 执行操作
    const result = functionToTest(input);
    
    // Assert - 验证结果
    expect(result).toBe('expected');
  });
});
```

### Mock Electron

```typescript
// 在文件顶部 mock 模块
jest.mock('electron', () => ({
  app: { getPath: jest.fn().mockReturnValue('/fake/path') },
  ipcMain: { handle: jest.fn() },
}));

import { MyModule } from '../MyModule';
```

### Mock 文件系统

```typescript
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
```

### 异步测试

```typescript
it('应该异步获取数据', async () => {
  const data = await asyncFunction();
  expect(data).toHaveProperty('id');
});
```

### 错误处理测试

```typescript
it('应该在失败时抛出错误', async () => {
  await expect(failingFunction()).rejects.toThrow('错误消息');
});
```

---

## ✅ 测试检查清单

在提交测试前，请检查：

- [ ] 测试文件名以 `.test.ts` 结尾
- [ ] 测试放在 `__tests__` 目录或同级目录下
- [ ] 使用有意义的测试名称（描述预期行为）
- [ ] 遵循 AAA 模式（Arrange-Act-Assert）
- [ ] 每个测试只验证一件事
- [ ] Mock 了所有外部依赖
- [ ] 测试是独立的（不依赖其他测试）
- [ ] 包含成功和失败场景
- [ ] 测试边界条件
- [ ] 运行 `npm test` 确保全部通过

---

## 🎯 测试优先级

### P0 - 必须测试（核心业务逻辑）
- ✅ OAuth 认证流程
- ✅ 插件管理核心功能
- ✅ 附件处理关键路径
- ✅ 模型适配器

### P1 - 应该测试（重要功能）
- ✅ IPC Handlers
- ✅ React Hooks
- ✅ 工具函数
- ✅ 数据验证

### P2 - 可以测试（锦上添花）
- ⏳ UI 组件渲染
- ⏳ 样式和布局
- ⏳ 简单的 getter/setter

---

## 🔧 常见问题解决

### Q: 测试文件找不到模块？
**A:** 检查导入路径是否正确
```typescript
// ❌ 错误
import { x } from '../../module';

// ✅ 正确
import { x } from '../module';
```

### Q: 如何测试私有方法？
**A:** 使用 TypeScript 的类型断言
```typescript
const result = (instance as any).privateMethod();
```

### Q: 如何处理异步代码？
**A:** 使用 async/await
```typescript
it('应该异步工作', async () => {
  const result = await asyncFunc();
  expect(result).toBeDefined();
});
```

### Q: 测试运行太慢怎么办？
**A:** 
1. 使用 `--maxWorkers=4` 限制并发
2. 只运行相关测试 `npx jest feature.test.ts`
3. 避免在测试中做真实 I/O

### Q: 如何跳过某个测试？
**A:** 使用 `.skip`
```typescript
it.skip('暂时跳过的测试', () => {});
```

---

## 📚 学习资源

### 内部文档
- `tests/COMPLETE_TEST_SUMMARY.md` - 完整测试总结
- `tests/OAUTH_TESTS.md` - OAuth 测试详解
- `tests/README.md` - 配置说明

### 官方文档
- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)

---

## 💡 最佳实践 Tips

1. **从简单开始** - 先测试纯函数，再测试复杂逻辑
2. **测试行为而非实现** - 关注"做什么"而非"怎么做"
3. **保持测试独立** - 不依赖其他测试的状态
4. **使用有意义的名称** - 读起来像文档
5. **Mock 外部依赖** - 数据库、API、文件系统
6. **测试边界条件** - 空值、极大值、极小值
7. **AAA 模式** - Arrange, Act, Assert
8. **一个测试一件事** - 保持测试小而专注

---

## 🎉 快速验证

运行以下命令验证测试环境正常：

```bash
# 1. 运行所有测试
npm test

# 2. 查看输出应该是
# Test Suites: 6 passed, 6 total
# Tests:       65+ passed
```

如果看到以上输出，说明测试环境完全正常！✅

---

**最后更新:** 2026-03-12  
**维护者:** OpenCrab Team
