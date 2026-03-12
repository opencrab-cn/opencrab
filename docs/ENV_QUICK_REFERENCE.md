# 环境变量配置速查表

## 🚀 3 分钟快速配置

### 步骤 1: 获取阿里云凭据（2 分钟）

1. 访问 **https://dash.console.aliyun.com/**
2. 登录阿里云账号
3. 进入 **应用管理** → **API 管理**
4. 点击 **创建应用**
5. 复制显示的：
   - `Client ID` (类似：`app-xxxxxxxxxxxxx`)
   - `Client Secret` (一串随机字符)

⚠️ **注意：** Client Secret 只显示一次，立即复制！

---

### 步骤 2: 配置 .env 文件（1 分钟）

编辑项目根目录的 `.env` 文件：

```bash
# 打开文件编辑
vim .env
# 或使用其他编辑器
code .env
nano .env
```

填入你的凭据：

```env
ALIYUN_CLIENT_ID=app-xxxxxxxxxxxxx
ALIYUN_CLIENT_SECRET=your_secret_here
NODE_ENV=development
```

保存并关闭。

---

### 步骤 3: 验证配置（30 秒）

```bash
# 1. 检查文件内容
cat .env

# 2. 重启应用
npm run dev
```

✅ **成功标志：** 点击登录会跳转到阿里云 OAuth 页面  
❌ **失败标志：** 仍然显示 "缺少 aliyun 的 OAuth 配置"

---

## 📋 常用命令

### 查看当前配置
```bash
cat .env
```

### 检查环境变量是否加载
```bash
# 在应用中添加调试日志
console.log('Client ID:', process.env.ALIYUN_CLIENT_ID);
```

### 临时设置环境变量（不修改 .env）
```bash
# macOS/Linux
export ALIYUN_CLIENT_ID=test123
npm run dev

# Windows PowerShell
$env:ALIYUN_CLIENT_ID="test123"
npm run dev
```

---

## 🔍 故障排查

| 问题 | 检查项 | 解决方法 |
|------|--------|----------|
| 配置不生效 | .env 文件位置 | 确保在项目根目录 |
| 变量未定义 | 拼写是否正确 | 检查 `ALIYUN_` 前缀 |
| 仍然报错 | 是否重启应用 | `Ctrl+C` 后重新 `npm run dev` |
| undefined | 文件格式 | 确保没有 BOM 头或特殊字符 |

---

## 📁 文件结构

```
opencrab/
├── .env              ← 你的配置（不要提交到 Git）
├── .env.example      ← 示例配置（可以查看）
├── .env.production   ← 生产环境配置
├── .gitignore        ← 包含 .env，防止误提交
└── docs/
    └── OAUTH_SETUP_GUIDE.md  ← 详细配置指南
```

---

## ⚠️ 安全提醒

### ✅ 正确做法
- [x] 使用 `.env` 存储敏感信息
- [x] 将 `.env` 添加到 `.gitignore`
- [x] 使用密码管理器备份凭据
- [x] 定期更新密钥

### ❌ 错误做法
- [ ] 将 `.env` 提交到 Git
- [ ] 在代码中硬编码密钥
- [ ] 通过聊天工具发送密钥
- [ ] 使用生产密钥进行测试

---

## 🎯 配置检查清单

配置完成后，请确认：

- [ ] `.env` 文件存在于项目根目录
- [ ] `ALIYUN_CLIENT_ID` 已正确填写
- [ ] `ALIYUN_CLIENT_SECRET` 已正确填写
- [ ] `NODE_ENV=development` 已设置
- [ ] `.env` 未出现在 Git 提交中
- [ ] 运行 `npm run dev` 可以正常启动
- [ ] 点击登录按钮会跳转到阿里云 OAuth 页面

全部勾选？🎉 配置成功！

---

## 🆘 快速帮助

### 忘记 Client Secret 怎么办？

1. 登录阿里云百炼平台
2. 找到你的应用
3. 点击 **重置密钥**
4. 复制新的密钥到 `.env`

### 配置泄露了怎么办？

1. **立即**在阿里云后台重置密钥
2. 更新 `.env` 文件
3. 检查 Git 历史是否有泄露

### 多人协作如何配置？

1. 每个人单独配置自己的 `.env`
2. 使用团队协作工具的安全笔记功能分享
3. 或使用 secrets 管理工具（如 Doppler）

---

## 📞 需要更多帮助？

- **详细指南:** `docs/OAUTH_SETUP_GUIDE.md`
- **示例配置:** `.env.example`
- **GitHub Issues:** https://github.com/opencrab/opencrab/issues

---

**版本:** 1.0  
**最后更新:** 2026-03-12  
**适用版本:** OpenCrab 0.1.0+
