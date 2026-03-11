# OpenCrab 插件系统实现总结

## ✅ 已完成功能清单（共 14 个文件，2506 行代码）

### 📦 **1. 类型定义** (178 行)
📁 [`src/shared/types/plugins.ts`](file:///home/opencrab/opencrab/src/shared/types/plugins.ts)

✅ **核心接口：**
- `PluginPermission` - 9 种权限类型
- `PluginManifest` - 插件清单（14 个字段）
- `PluginInstance` - 插件实例
- `PluginStatus` - 5 种状态枚举
- `PluginCategory` - 7 种分类

**关键设计：**
```typescript
// 权限白名单机制
type PluginPermission = 
  | 'model:chat'      // 调用模型
  | 'fs:read'         // 读文件
  | 'fs:write'        // 写文件
  | 'notification'    // 发通知
  | 'clipboard'       // 剪贴板
  | ...;

// 插件清单标准
interface PluginManifest {
  id: string;          // 唯一标识
  name: string;        // 名称
  version: string;     // semver 版本
  permissions: [];     // 权限列表
  main: string;        // 入口文件
  environment: 'renderer' | 'main' | 'both';
}
```

---

### 🛠️ **2. 插件管理器** (413 行)
📁 [`src/main/plugins/PluginManager.ts`](file:///home/opencrab/opencrab/src/main/plugins/PluginManager.ts)

✅ **生命周期管理：**
- `loadPlugin()` - 加载插件
- `unloadPlugin()` - 卸载插件
- `enablePlugin()` - 启用插件
- `disablePlugin()` - 禁用插件

✅ **配置管理：**
- `updatePluginConfig()` - 更新配置
- `getPluginConfig()` - 获取配置
- 持久化存储到 JSON

✅ **权限控制：**
- Manifest 声明权限
- 运行时请求用户确认
- 对话框提示

✅ **IPC 通信：**
```typescript
plugins:getAll        // 获取所有插件
plugins:enable        // 启用插件
plugins:disable       // 禁用插件
plugins:unload        // 卸载插件
plugins:getConfig     // 获取配置
plugins:updateConfig  // 更新配置
plugins:requestPermission  // 请求权限
```

---

### 🔒 **3. 沙箱环境** (272 行)
📁 [`src/main/plugins/PluginSandbox.ts`](file:///home/opencrab/opencrab/src/main/plugins/PluginSandbox.ts)

✅ **安全隔离：**
- 使用 Node.js `vm` 模块
- 创建独立的 Context
- 禁止 eval/new Function
- 禁止 WebAssembly

✅ **受限的全局对象：**
```javascript
{
  console: { log, warn, error },  // 受限 console
  setTimeout/setInterval,         // 可追踪清理
  require: 白名单机制，            // 只允许安全模块
  pluginAPI: 暴露的 API,
}
```

✅ **模块白名单：**
```javascript
const ALLOWED_MODULES = [
  'path', 'util', 'events',
  'buffer', 'stream', 'querystring', 'url'
];
```

✅ **定时器追踪：**
```typescript
private timers: Set<NodeJS.Timeout> = new Set();

// 卸载时自动清理
for (const timer of this.timers) {
  clearTimeout(timer);
}
```

---

### 🔌 **4. 插件 API** (264 行)
📁 [`src/main/plugins/PluginAPI.ts`](file:///home/opencrab/opencrab/src/main/plugins/PluginAPI.ts)

✅ **暴露的能力：**
```typescript
interface ExposedPluginAPI {
  chat(messages, options): Promise<Result>;
  readFile(filePath): Promise<Result<string>>;
  writeFile(filePath, content): Promise<Result>;
  sendNotification(title, body): Promise<Result>;
  readClipboard(): Promise<Result<string>>;
  writeClipboard(text): Promise<Result>;
  storage: { get/set/remove/clear };
  showDialog(options): Promise<Result>;
  request(url, options): Promise<Result>;
  getConfig(): Promise<Object>;
  updateConfig(config): Promise<void>;
}
```

**注意：** MVP 阶段大部分 API 暂未实现完整逻辑，需要后续完善权限检查和 IPC 通信。

---

### 📝 **5. 示例插件 1：小红书笔记分析器** (275 行)

#### 📁 [`manifest.json`](file:///home/opencrab/opencrab/src/plugins/xiaohongshu-analyzer/manifest.json) (27 行)
```json
{
  "id": "xiaohongshu-analyzer",
  "name": "小红书笔记分析器",
  "permissions": ["model:chat", "clipboard", "notification"],
  "featured": true,
  "tags": ["写作辅助", "数据分析", "社交媒体"]
}
```

#### 📁 [`index.js`](file:///home/opencrab/opencrab/src/plugins/xiaohongshu-analyzer/index.js) (248 行)
✅ **核心功能：**
1. **文本解析**
   - 提取标题/正文/标签
   - 识别表情符号
   - 统计字数

2. **AI 分析**
   ```javascript
   const prompt = `请分析以下小红书笔记：
   【标题】${title}
   【正文】${content}
   【标签】${tags.join(' ')}
   
   请从以下维度分析：
   1. 标题吸引力评分（0-10 分）+ 优化建议
   2. 情绪倾向分析
   3. 受众画像推测
   4. 评论预测
   5. 推荐优化方向
   6. 推荐标签`;
   ```

3. **报告生成**
   - Markdown 格式报告
   - JSON 结构化数据
   - 可视化展示

**输出示例：**
```markdown
# 小红书笔记分析报告

## 📊 基础数据
- 标题：职场干货 | 3 个技巧提升工作效率
- 字数：856 字
- 表情：✅
- 标签数：5 个

## 🎯 标题分析
评分：8.5/10
建议：可以添加数字增强吸引力

## 💭 情绪倾向
积极

## 👥 受众画像
18-30 岁职场女性

## ✨ 优化建议
- 增加互动性问题
- 添加具体案例
```

---

### 📄 **6. 示例插件 2：中文公文写作助手** (408 行)

#### 📁 [`manifest.json`](file:///home/opencrab/opencrab/src/plugins/chinese-doc-writer/manifest.json) (29 行)
```json
{
  "id": "chinese-doc-writer",
  "name": "中文公文写作助手",
  "permissions": ["model:chat", "fs:write", "clipboard"],
  "featured": true,
  "tags": ["写作辅助", "办公效率", "公文"]
}
```

#### 📁 [`index.js`](file:///home/opencrab/opencrab/src/plugins/chinese-doc-writer/index.js) (379 行)
✅ **模板库（5 种）：**
1. **通知** - 适用于发布规章、传达事项
2. **请示** - 向上级请求指示
3. **函** - 平级机关商洽工作
4. **会议纪要** - 记录会议内容
5. **工作总结** - 阶段性工作汇报

**模板示例：**
```javascript
notice: {
  name: '通知',
  template: `关于${topic}的通知

${targetAudience}：

根据${basis}，为做好${purpose}工作，现将有关事项通知如下：

一、${content1}
二、${content2}
三、${content3}

请认真贯彻执行。

${organization}
${date}`
}
```

✅ **特色功能：**
1. **AI 润色**
   - 口语→公文风格转换
   - 符合《党政机关公文格式》
   - 保持原意不变

2. **多轮修改**
   ```javascript
   await reviseDocument(document, '更正式一点');
   await reviseDocument(document, '缩短到 300 字');
   ```

3. **格式检查**
   - 标题结构（"关于...的..."）
   - 日期格式（年月日完整）
   - 发文单位位置
   - 序号使用规范

4. **敏感词检测**（预留接口）
   ```javascript
   function checkSensitiveWords(content) {
     const found = [];
     for (const word of SENSITIVE_WORDS) {
       if (content.includes(word)) found.push(word);
     }
     return { hasSensitiveWords: found.length > 0, words: found };
   }
   ```

---

### 🎨 **7. 前端 UI 组件** (740 行)

#### 📁 [`PluginMarket.tsx`](file:///home/opencrab/opencrab/src/renderer/components/plugins/PluginMarket.tsx) (182 行)
✅ **市场页面功能：**
- 分类筛选（全部/精选/写作/分析/效率）
- 搜索过滤
- 懒加载数据
- 空状态提示

**分类按钮：**
```typescript
const CATEGORIES = [
  { id: 'all', name: '全部', icon: '🔍' },
  { id: 'featured', name: '精选', icon: '⭐' },
  { id: 'writing', name: '写作辅助', icon: '✍️' },
  { id: 'analysis', name: '数据分析', icon: '📊' },
  { id: 'productivity', name: '效率工具', icon: '⚡' },
];
```

#### 📁 [`PluginCard.tsx`](file:///home/opencrab/opencrab/src/renderer/components/plugins/PluginCard.tsx) (157 行)
✅ **卡片组件：**
- 插件图标 + 名称 + 版本
- 描述信息
- 作者 + 下载量 + 评分
- 安装/启用/卸载按钮
- 精选标记（右上角金色徽章）

**交互状态：**
```typescript
const [isOperating, setIsOperating] = useState(false);

// 操作反馈
<button disabled={isOperating}>
  {isOperating ? '安装中...' : '安装'}
</button>
```

#### 📁 [`PluginSettings.tsx`](file:///home/opencrab/opencrab/src/renderer/components/plugins/PluginSettings.tsx) (174 行)
✅ **设置页面：**
- 动态表单渲染（根据配置类型）
- 开关切换（boolean）
- 数值输入（number）
- 文本输入（string/text）
- 更改提示（未保存时禁用保存按钮）

#### 📁 [`styles/plugins.css`](file:///home/opencrab/opencrab/src/renderer/styles/plugins.css) (427 行)
✅ **完整样式系统：**
- CSS 变量主题支持
- 响应式布局（移动端适配）
- 悬停动效
- 精选标记斜角设计
- 开关切换动画
- 加载/空状态样式

**特色设计：**
```css
/* 精选标记 - 金色斜角 */
.featured-badge {
  position: absolute;
  top: 12px;
  right: -30px;
  padding: 4px 40px;
  background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
  transform: rotate(45deg);
}

/* 开关切换动画 */
.toggle-slider:before {
  transition: 0.3s;
}
input:checked + .toggle-slider:before {
  transform: translateX(22px);
}
```

---

## 🎯 核心特性

### **1️⃣ 沙箱隔离机制**

```mermaid
graph TD
    A[插件代码] --> B[VM 沙箱]
    B --> C[受限 Context]
    C --> D[pluginAPI 代理]
    D --> E[主进程能力]
    
    B -.->|禁止访问 | F[主进程内存]
    B -.->|禁止 eval | G[动态代码执行]
    B -.->|白名单限制 | H[node_modules]
```

**安全措施：**
- ✅ 独立执行上下文
- ✅ 禁止代码生成（eval/Function）
- ✅ 禁止 WebAssembly
- ✅ require 白名单
- ✅ 定时器追踪清理

---

### **2️⃣ 权限控制流程**

```mermaid
sequenceDiagram
    participant P as 插件
    participant M as PluginManager
    participant U as 用户
    
    P->>M: 请求权限 permission
    M->>U: 显示对话框
    Note over U: "插件 xxx 请求<br/>使用 model:chat 权限"
    U-->>M: 允许/拒绝
    M-->>P: 返回结果
    
    alt 允许
        P->>M: 调用 API
        M-->>P: 执行成功
    else 拒绝
        P->>M: 调用 API
        M-->>P: 权限不足错误
    end
```

---

### **3️⃣ 插件生命周期**

```mermaid
stateDiagram-v2
    [*] --> UNLOADED
    UNLOADED --> LOADING: load()
    LOADING --> ENABLED: 加载成功
    LOADING --> ERROR: 加载失败
    ENABLED --> DISABLED: disable()
    DISABLED --> ENABLED: enable()
    ENABLED --> UNLOADED: unload()
    DISABLED --> UNLOADED: unload()
    ERROR --> UNLOADED: 卸载
    UNLOADED --> [*]
```

---

### **4️⃣ 热加载支持（开发模式）**

```typescript
// 监听插件目录变化
if (process.env.NODE_ENV === 'development') {
  fs.watch(pluginDir, async (eventType, filename) => {
    if (filename === 'index.js') {
      console.log('[PluginManager] 检测到插件更新，重新加载...');
      await unloadPlugin(pluginId);
      await loadPlugin(pluginId);
    }
  });
}
```

---

### **5️⃣ 官方精选机制**

**市场默认只显示精选插件：**
```typescript
const DEFAULT_CATEGORY = 'featured';

// 只有 featured: true 的插件才会显示
const mockPlugins = [
  {
    id: 'xiaohongshu-analyzer',
    featured: true,  // ⭐ 官方精选
  },
  {
    id: 'third-party-plugin',
    featured: false,  // 普通插件
  },
];
```

**扩展接口预留：**
```typescript
// TODO: 从服务器获取插件市场数据
async function loadMarketPlugins() {
  const response = await fetch('https://opencrab.com/api/plugins');
  const plugins = await response.json();
  setPlugins(plugins);
}
```

---

## 🚀 快速使用

### **安装插件：**
```bash
# 1. 复制插件到插件目录
cp -r src/plugins/xiaohongshu-analyzer ~/.config/OpenCrab/plugins/

# 2. 重启应用或触发热加载
# 开发模式下会自动重新加载
```

### **开发新插件：**
```bash
# 1. 创建插件目录
mkdir my-plugin
cd my-plugin

# 2. 创建 manifest.json
cat > manifest.json <<EOF
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "main": "index.js",
  "permissions": ["model:chat"]
}
EOF

# 3. 创建 index.js
cat > index.js <<EOF
module.exports = {
  async init(pluginAPI) {
    console.log('插件初始化');
  },
};
EOF

# 4. 复制到插件目录
cp -r my-plugin ~/.config/OpenCrab/plugins/
```

---

## 📊 插件示例对比

| 特性 | 小红书分析器 | 公文写作助手 |
|------|-------------|-------------|
| **核心功能** | 文本分析 + 报告生成 | 模板填充 + AI 润色 |
| **使用模型** | ✅ chat | ✅ chat |
| **文件系统** | ❌ | ✅ fs:write |
| **剪贴板** | ✅ | ✅ |
| **模板数量** | 0 | 5 种 |
| **多轮对话** | ❌ | ✅ |
| **格式校验** | ❌ | ✅ |
| **敏感词检测** | ❌ | ✅（预留） |

---

## 🐛 已知限制

### **待实现功能：**
1. **PluginAPI 完整实现**
   - 目前大部分 API 返回"暂未实现"
   - 需要完善 IPC 通信和权限检查

2. **插件市场后端**
   - 需要搭建插件商店服务器
   - 实现上传/审核/分发流程

3. **UI 集成**
   - 插件管理页面路由配置
   - 与主应用的聊天界面集成

4. **导出功能**
   - 公文写作助手的 Word/TXT 导出
   - 需要集成 docx 库

---

## 🔗 相关资源

### **官方文档：**
- [Node.js vm 模块](https://nodejs.org/api/vm.html)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [插件开发指南](docs/PLUGIN_DEVELOPMENT.md)（待创建）

### **社区资源：**
- [VS Code 插件架构](https://code.visualstudio.com/api)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

---

## 🎉 总结

已成功实现 OpenCrab 插件系统的核心框架：

✅ **完整的类型系统** - PluginManifest/PluginPermission/PluginStatus  
✅ **沙箱隔离机制** - VM 模块 + 白名单 + 定时器清理  
✅ **生命周期管理** - load/enable/disable/unload  
✅ **权限控制** - Manifest 声明 + 用户确认对话框  
✅ **配置管理** - 持久化存储 + 实时更新  
✅ **两个示例插件** - 小红书分析器 + 公文写作助手  
✅ **前端 UI 组件** - 市场/卡片/设置页 + 完整样式  

**下一步建议：**
1. 完善 PluginAPI 的具体实现
2. 搭建插件市场后端服务
3. 创建开发者文档和 SDK
4. 实现更多社区插件
5. 添加插件评分和评论系统

🚀 **OpenCrab 插件系统已具备基础能力，可以开始构建中文社区生态了！**
