# Changelog

All notable changes to OpenCrab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2024-03-11

### 🎉 初始发布

#### ✨ 新增功能

**核心能力**
- 🔐 OAuth 2.0 认证系统（阿里云/腾讯云等国内平台）
- 💬 AI 聊天对话（支持通义千问、文心一言等模型）
- 🎨 多模态输入（图片/语音/文本）
- 🔌 插件系统架构
- 🔄 自动更新机制

**聊天功能**
- ✅ 流式响应实时显示
- ✅ Markdown 渲染 + 代码高亮
- ✅ 多轮对话上下文保持
- ✅ 消息历史记录

**多模态交互**
- ✅ 图片上传和预览
- ✅ Canvas 图片压缩（最大边长 1024px，质量 80%）
- ✅ MediaRecorder 语音录制
- ✅ 音频转码（WebM → MP3，预留接口）
- ✅ 附件管理栏（添加/删除/状态显示）

**插件生态**
- ✅ 插件沙箱隔离（Node.js VM 模块）
- ✅ 权限控制机制（Manifest 声明 + 用户确认）
- ✅ 生命周期管理（load/enable/disable/unload）
- ✅ 配置持久化存储
- ✅ 官方精选市场（分类筛选 + 搜索）

**示例插件**
- 📝 **小红书笔记分析器**
  - 文本解析（标题/正文/标签/表情提取）
  - AI 多维度分析（评分/情绪/受众/评论预测）
  - Markdown 报告生成
  - 推荐优化建议
- 📄 **中文公文写作助手**
  - 5 种模板库（通知/请示/函/会议纪要/工作总结）
  - AI 润色（口语→公文风格）
  - 多轮修改支持
  - 格式检查（《党政机关公文格式》）
  - 敏感词检测（预留接口）

**用户体验**
- ✅ 深色/浅色主题切换
- ✅ TailwindCSS 响应式布局
- ✅ 流畅的动画效果
- ✅ 友好的错误提示
- ✅ 加载状态指示器

#### 🛠️ 技术架构

**主进程 (Main Process)**
- Electron 28.1.0
- TypeScript 5.3.3
- OAuth Provider 抽象层（Strategy 模式）
- Model Adapter 接口（IModelAdapter）
- Plugin Manager（生命周期管理）
- Plugin Sandbox（VM 隔离）
- IPC 通信处理器

**渲染进程 (Renderer Process)**
- React 18.2.0
- Vite 5.0.11
- Zustand 4.5.0（状态管理）
- React Router DOM 6.21.1
- TailwindCSS 3.4.1
- markdown-it 14.0.0
- highlight.js 11.9.0

**构建和部署**
- electron-builder 24.9.1
- GitHub Actions CI/CD
- macOS 代码签名 + Notarization
- Windows NSIS 安装包
- Linux AppImage

#### 📦 打包特性

**跨平台支持**
- ✅ Windows (NSIS, x64/ARM64)
- ✅ macOS (DMG + ZIP, Intel/Apple Silicon)
- ✅ Linux (AppImage, x64/ARM64)

**体积优化**
- ✅ Tree Shaking（Vite 自动）
- ✅ 按需加载（动态 import）
- ✅ 原生模块预编译（keytar/sharp/fluent-ffmpeg）
- ✅ 最大压缩级别
- ✅ 排除开发依赖

**自动更新**
- ✅ electron-updater 集成
- ✅ 定时检查（每 2 小时）
- ✅ 后台下载
- ✅ 断点续传支持
- ✅ 用户自愿重启
- ✅ 错误回滚机制

#### 🔒 安全性

- ✅ keytar 安全存储（系统钥匙串）
- ✅ 无硬编码 API Key
- ✅ OAuth Token 本地加密
- ✅ 插件权限最小化
- ✅ CSP 策略配置
- ✅ 依赖漏洞扫描

#### 📚 文档

- ✅ README.md（中英双语）
- ✅ BUILD_GUIDE.md（完整构建指南）
- ✅ PRODUCTION_SUMMARY.md（生产部署总结）
- ✅ PLUGIN_SYSTEM_SUMMARY.md（插件系统详解）
- ✅ MULTIMODAL_MESSAGE_FORMAT.md（多模态格式说明）
- ✅ RELEASE_CHECKLIST.md（发布检查清单）
- ✅ SCREENSHOT_GUIDE.md（截图规范指南）

#### 🤝 社区

- ✅ MIT License
- ✅ CONTRIBUTING.md（贡献指南）
- ✅ CODE_OF_CONDUCT.md（行为准则）
- ✅ GitHub Issues 模板（Bug/Feature/Plugin）
- ✅ GitHub Workflows（CI/CD）

---

## [Unreleased]

### 🚧 计划中功能

#### v1.1.0 (预计 2024-04)
- [ ] 更多国产大模型支持（百度文心、科大讯飞）
- [ ] 插件市场后端服务
- [ ] 插件评分和评论系统
- [ ] 文件解析功能（PDF/Word 文本提取）
- [ ] 聊天记录导出（Markdown/PDF）
- [ ] 全局快捷键支持

#### v1.2.0 (预计 2024-05)
- [ ] 自定义模型接入（用户配置 API）
- [ ] 对话模板系统
- [ ] 批量图片处理
- [ ] 语音转文字（Whisper.cpp 集成）
- [ ] 主题商店

#### 长期规划
- [ ] 移动端应用（React Native）
- [ ] Web 版本（纯浏览器运行）
- [ ] 企业版（私有化部署）
- [ ] 插件开发者文档和 SDK
- [ ] 多语言国际化（i18n）

---

## 版本说明

### 版本号规则

遵循 Semantic Versioning 语义化版本规范：

- **MAJOR.MINOR.PATCH**（主版本号。次版本号。修订号）
- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

### 发布周期

- **Major Version**: 每 3-6 个月
- **Minor Version**: 每 2-4 周
- **Patch Version**: 随时发布（紧急修复）

### 命名约定

- **Breaking Changes**: 在 MAJOR 版本中说明
- **New Features**: 在 MINOR 版本中说明
- **Bug Fixes**: 在 PATCH 版本中说明

---

## 相关链接

- [GitHub Releases](https://github.com/opencrab/opencrab/releases)
- [项目主页](https://github.com/opencrab/opencrab)
- [问题反馈](https://github.com/opencrab/opencrab/issues)
- [讨论区](https://github.com/opencrab/opencrab/discussions)

---

**最后更新**: 2024-03-11  
**当前版本**: v1.0.0  
**维护者**: OpenCrab Team
