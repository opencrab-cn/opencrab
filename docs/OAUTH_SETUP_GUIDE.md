# 阿里云 OAuth 配置指南

## 📋 快速开始

### 1. 获取阿里云 OAuth 凭据

#### 步骤 1: 访问阿里云百炼平台

打开浏览器访问：**https://dash.console.aliyun.com/**

#### 步骤 2: 创建应用

1. 登录阿里云账号
2. 进入 **百炼控制台**
3. 点击左侧菜单 **应用管理** → **API 管理**
4. 点击 **创建应用** 按钮

#### 步骤 3: 填写应用信息

```
应用名称：OpenCrab (或其他你喜欢的名称)
应用描述：OpenCrab AI 助手
回调地址：http://127.0.0.1/callback (开发环境)
```

#### 步骤 4: 获取凭据

创建成功后，你会看到：
- **Client ID** (客户端 ID) - 类似：`app-xxxxxxxxxxxxx`
- **Client Secret** (客户端密钥) - 一串随机字符

⚠️ **重要：** Client Secret 只显示一次，请立即复制保存！

---

### 2. 配置环境变量

#### 方法一：使用 .env 文件（推荐）

1. 在项目根目录创建 `.env` 文件：
   ```bash
   # 已经创建，直接编辑即可
   vim .env
   ```

2. 填入你的凭据：
   ```env
   ALIYUN_CLIENT_ID=app-xxxxxxxxxxxxx
   ALIYUN_CLIENT_SECRET=your_secret_here
   NODE_ENV=development
   ```

3. 保存文件

#### 方法二：使用命令行变量

**macOS/Linux:**
```bash
export ALIYUN_CLIENT_ID=app-xxxxxxxxxxxxx
export ALIYUN_CLIENT_SECRET=your_secret_here
npm run dev
```

**Windows PowerShell:**
```powershell
$env:ALIYUN_CLIENT_ID="app-xxxxxxxxxxxxx"
$env:ALIYUN_CLIENT_SECRET="your_secret_here"
npm run dev
```

**Windows CMD:**
```cmd
set ALIYUN_CLIENT_ID=app-xxxxxxxxxxxxx
set ALIYUN_CLIENT_SECRET=your_secret_here
npm run dev
```

---

### 3. 验证配置

#### 检查 .env 文件是否存在

```bash
ls -la .env
```

应该看到类似输出：
```
-rw-r--r--  1 user  staff  512 Mar 12 10:00 .env
```

#### 检查配置内容

```bash
cat .env
```

应该看到：
```env
ALIYUN_CLIENT_ID=app-xxxxxxxxxxxxx
ALIYUN_CLIENT_SECRET=***********
NODE_ENV=development
```

#### 测试应用

```bash
# 重启应用
npm run dev
```

在应用中点击登录按钮，如果配置正确：
- ✅ 会跳转到阿里云 OAuth 授权页面
- ❌ 之前显示 "缺少 aliyun 的 OAuth 配置"

---

## 🔒 安全注意事项

### ⚠️ 绝对不要做的事

1. **不要提交 .env 到 Git**
   ```bash
   # .env 已经在 .gitignore 中
   git add .env  # ❌ 错误！
   ```

2. **不要分享你的 Client Secret**
   - 这是敏感凭据
   - 泄露后需要立即在阿里云后台重置

3. **不要在生产环境使用开发凭据**
   - 生产环境应该使用单独的 app

### ✅ 推荐的做法

1. **使用 .gitignore**
   ```bash
   # 项目已有此配置
   echo ".env" >> .gitignore
   ```

2. **备份凭据到安全位置**
   - 使用密码管理器（1Password, LastPass 等）
   - 或加密存储

3. **定期轮换密钥**
   - 每 3-6 个月更新一次
   - 离职员工/前团队成员访问后立即更新

---

## 🛠️ 故障排查

### 问题 1: 仍然显示 "缺少 OAuth 配置"

**可能原因：**
- .env 文件不在正确位置
- 变量名拼写错误
- 需要重启应用

**解决方法：**
```bash
# 1. 确认文件位置
ls -la .env

# 2. 确认变量名正确
cat .env | grep ALIYUN

# 3. 完全重启应用
rm -rf node_modules/.vite/
npm run dev
```

### 问题 2: 配置加载失败

**检查 vite.config.ts 是否正确配置：**

```typescript
// vite.config.ts 应该包含
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // ...
});
```

### 问题 3: Electron 无法读取环境变量

Electron 主进程读取环境变量的方式：

```typescript
// src/main/electron.main.ts
console.log('ALIYUN_CLIENT_ID:', process.env.ALIYUN_CLIENT_ID);
// 应该输出你的 Client ID，而不是 undefined
```

---

## 📱 移动端测试配置

如果你需要在移动设备上测试：

### 修改回调地址

在阿里云后台修改应用的回调地址：
```
http://your-local-ip:3000/callback
```

例如：
```
http://192.168.1.100:3000/callback
```

### 启动时绑定 IP

```bash
npm run dev -- --host 0.0.0.0
```

---

## 🚀 生产环境配置

### 创建 .env.production

```env
# 生产环境使用不同的凭据
ALIYUN_CLIENT_ID=prod-app-xxxxxxxxxxxxx
ALIYUN_CLIENT_SECRET=prod_secret_here
NODE_ENV=production
```

### 使用系统环境变量（推荐用于部署）

**Docker:**
```dockerfile
ENV ALIYUN_CLIENT_ID=xxx
ENV ALIYUN_CLIENT_SECRET=xxx
```

**GitHub Actions:**
```yaml
env:
  ALIYUN_CLIENT_ID: ${{ secrets.ALIYUN_CLIENT_ID }}
  ALIYUN_CLIENT_SECRET: ${{ secrets.ALIYUN_CLIENT_SECRET }}
```

**Vercel/Netlify:**
在平台的环境变量设置中添加：
- `ALIYUN_CLIENT_ID`
- `ALIYUN_CLIENT_SECRET`

---

## 📝 配置示例

### 完整的 .env 文件

```env
# ========== 阿里云 OAuth 配置 ==========
ALIYUN_CLIENT_ID=app-2026031201
ALIYUN_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# ========== 开发环境设置 ==========
NODE_ENV=development

# ========== 可选配置 ==========
# 自定义端口
# PORT=3000

# 调试模式
# DEBUG=true

# HTTP 代理（如果需要）
# HTTP_PROXY=http://proxy.example.com:8080
```

---

## 🎯 验证清单

配置完成后，请检查：

- [ ] `.env` 文件已创建
- [ ] `ALIYUN_CLIENT_ID` 已填写
- [ ] `ALIYUN_CLIENT_SECRET` 已填写
- [ ] `NODE_ENV=development` 已设置
- [ ] `.env` 未提交到 Git
- [ ] 应用可以正常启动
- [ ] 点击登录会跳转到阿里云 OAuth 页面

---

## 🆘 获取帮助

### 官方文档

- [阿里云百炼平台文档](https://help.aliyun.com/product/42154.html)
- [OAuth 2.0 授权流程](https://help.aliyun.com/document_detail/93732.html)

### 常见问题

查看项目的 FAQ 文档或提 Issue。

---

## 📞 联系支持

如有问题，请联系：
- Email: support@opencrab.dev
- GitHub Issues: https://github.com/opencrab/opencrab/issues

---

**最后更新:** 2026-03-12  
**维护者:** OpenCrab Team
