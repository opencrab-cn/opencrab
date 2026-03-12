# 白屏问题排查指南

## 🖥️ 症状

打开应用后显示空白页面，没有任何内容。

---

## 🔍 诊断步骤

### 1. 检查开发控制台

开发模式下运行时，DevTools 会自动打开。查看以下标签：

#### Console 标签
```javascript
// 查找错误信息
- "Failed to load module"
- "Uncaught Error"
- "Cannot find module"
```

#### Network 标签
```
检查资源加载状态:
- index.html ✅
- *.js files ✅
- *.css files ✅
```

---

### 2. 常见问题及解决方案

#### ❌ 问题 1: CSS 文件加载失败

**症状:**
```
GET http://localhost:5173/src/styles/chat.css net::ERR_ABORTED 404
```

**原因:**
- Vite 配置中缺少 CSS 文件路径
- 文件路径拼写错误

**解决:**
```typescript
// src/renderer/main.tsx
import './styles/chat.css'; // ✅ 确保路径正确
```

**验证:**
```bash
ls src/renderer/styles/chat.css
```

---

#### ❌ 问题 2: React 组件渲染错误

**症状:**
```
Error: Uncaught [TypeError: Cannot read properties of undefined]
```

**原因:**
- Hook 返回值未定义
- 组件属性类型不匹配
- IPC 调用失败

**解决:**
```typescript
// 添加错误边界
try {
  const { isAuthenticated } = useAuth('aliyun');
} catch (error) {
  console.error('认证失败:', error);
}
```

**验证:**
```bash
npm run typecheck
```

---

#### ❌ 问题 3: Electron 主进程未启动

**症状:**
```
IPC renderer invoke failed: channel "auth:getStatus"
```

**原因:**
- 主进程编译失败
- IPC 处理器未注册
- Preload 脚本路径错误

**解决:**
```bash
# 重新编译主进程
tsc -p tsconfig.main.json

# 检查编译产物
ls dist/main/electron.main.js
ls dist/preload/index.js
```

**验证:**
```bash
# 开发模式运行，查看详细日志
npm run dev
```

---

#### ❌ 问题 4: 路由配置错误

**症状:**
```
No routes matched location "/"
```

**原因:**
- React Router 配置错误
- 路由路径不匹配

**解决:**
```typescript
// src/renderer/App.tsx
<Router>
  <Routes>
    <Route path="/" element={<Navigate to="/chat" replace />} />
    <Route path="/chat" element={<ChatPage />} />
  </Routes>
</Router>
```

**验证:**
```bash
# 检查路由配置
cat src/renderer/App.tsx
```

---

### 3. 快速修复命令

#### 清理并重建
```bash
# 清理构建产物
rm -rf dist/ release/

# 清理 node_modules（可选）
rm -rf node_modules/

# 重新安装依赖
npm install

# 重新编译
npm run build

# 开发模式运行
npm run dev
```

#### 检查 TypeScript
```bash
# 类型检查
npm run typecheck

# 如果有错误，根据提示修复
```

#### 查看构建产物
```bash
# 检查渲染进程文件
ls -la dist/renderer/

# 检查主进程文件
ls -la dist/main/

# 检查预加载脚本
ls -la dist/preload/
```

---

### 4. 生产环境白屏

如果是打包后的应用白屏：

#### 查看日志
```bash
# macOS
open /Applications/OpenCrab.app/Contents/MacOS/OpenCrab --args --enable-logging

# 查看日志文件
cat ~/Library/Application\ Support/OpenCrab/logs/main.log
```

#### 清除应用数据
```bash
# 删除应用配置和数据
rm -rf ~/Library/Application\ Support/OpenCrab/
```

#### 重新打包
```bash
npm run build:mac
```

---

## 🛠️ 调试工具

### React DevTools
```bash
# 安装扩展
# Chrome: React Developer Tools
# Firefox: React DevTools
```

### Electron DevTools
```javascript
// 在主进程中手动打开
mainWindow.webContents.openDevTools();
```

### 网络面板
```
Network > Disable cache (清空缓存)
Network > Throttling (模拟慢速网络)
```

---

## 📋 检查清单

- [ ] DevTools 中有错误信息吗？
- [ ] CSS 文件加载成功吗？
- [ ] JS 文件没有语法错误吧？
- [ ] IPC 通道名称正确吗？
- [ ] 主进程启动了吗？
- [ ] 路由配置匹配吗？
- [ ] 组件有返回值吗？
- [ ] Hook 使用正确吗？

---

## 💡 预防措施

1. **使用 TypeScript**
   - 启用严格模式
   - 配置正确的 tsconfig

2. **添加错误边界**
   ```typescript
   class ErrorBoundary extends React.Component {
     componentDidCatch(error: Error) {
       console.error('捕获到错误:', error);
     }
   }
   ```

3. **编写单元测试**
   ```bash
   npm test
   ```

4. **代码审查**
   - 使用 ESLint
   - 启用 Prettier

---

**最后更新:** 2026-03-12  
**维护者:** OpenCrab Team
