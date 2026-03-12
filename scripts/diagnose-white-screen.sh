#!/bin/bash

# OpenCrab 白屏问题诊断脚本
# 使用方法：bash scripts/diagnose-white-screen.sh

set -e

echo "🦀 OpenCrab 白屏问题诊断工具"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} 文件存在：$1"
    return 0
  else
    echo -e "${RED}✗${NC} 文件不存在：$1"
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} 目录存在：$1"
    return 0
  else
    echo -e "${RED}✗${NC} 目录不存在：$1"
    return 1
  fi
}

check_npm_package() {
  if npm list "$1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 已安装：$1"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} 未安装：$1"
    return 1
  fi
}

echo "1️⃣  检查关键文件..."
echo "-------------------"
check_file "package.json"
check_file "vite.config.ts"
check_file "tsconfig.json"
check_file "index.html"
echo ""

echo "2️⃣  检查源代码文件..."
echo "---------------------"
check_file "src/main/electron.main.ts"
check_file "src/preload/index.ts"
check_file "src/renderer/main.tsx"
check_file "src/renderer/App.tsx"
check_file "src/renderer/pages/ChatPage.tsx"
echo ""

echo "3️⃣  检查样式文件..."
echo "-------------------"
check_file "src/renderer/styles/chat.css"
check_file "src/renderer/styles/attachments.css"
check_file "src/renderer/styles/plugins.css"
echo ""

echo "4️⃣  检查构建产物..."
echo "-------------------"
check_dir "dist/main"
check_dir "dist/preload"
check_dir "dist/renderer"
if [ -f "dist/main/electron.main.js" ]; then
  echo -e "${GREEN}✓${NC} 主进程已编译"
else
  echo -e "${YELLOW}⚠${NC} 主进程未编译，运行：npm run build"
fi
if [ -f "dist/preload/index.js" ]; then
  echo -e "${GREEN}✓${NC} 预加载脚本已编译"
else
  echo -e "${YELLOW}⚠${NC} 预加载脚本未编译，运行：npm run build"
fi
if [ -f "dist/renderer/index.html" ]; then
  echo -e "${GREEN}✓${NC} 渲染进程已编译"
else
  echo -e "${YELLOW}⚠${NC} 渲染进程未编译，运行：npm run build"
fi
echo ""

echo "5️⃣  检查测试依赖..."
echo "-------------------"
check_npm_package "@testing-library/react"
check_npm_package "@testing-library/jest-dom"
check_npm_package "jest"
check_npm_package "ts-jest"
check_npm_package "@types/jest"
echo ""

echo "6️⃣  检查 TypeScript 配置..."
echo "---------------------------"
if [ -f "tests/tsconfig.json" ]; then
  echo -e "${GREEN}✓${NC} 测试 TypeScript 配置存在"
else
  echo -e "${YELLOW}⚠${NC} 测试 TypeScript 配置不存在"
fi
if [ -f "jest.config.js" ]; then
  echo -e "${GREEN}✓${NC} Jest 配置存在"
else
  echo -e "${YELLOW}⚠${NC} Jest 配置不存在"
fi
echo ""

echo "7️⃣  运行类型检查..."
echo "-------------------"
if npm run typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} TypeScript 类型检查通过"
else
  echo -e "${RED}✗${NC} TypeScript 类型检查失败，运行：npm run typecheck"
fi
echo ""

echo "8️⃣  检查环境变量..."
echo "-------------------"
if [ -f ".env" ]; then
  echo -e "${GREEN}✓${NC} .env 文件存在"
  if grep -q "ALIYUN_CLIENT_ID" .env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} ALIYUN_CLIENT_ID 已配置"
  else
    echo -e "${YELLOW}⚠${NC} ALIYUN_CLIENT_ID 未配置（开发模式可选）"
  fi
else
  echo -e "${YELLOW}⚠${NC} .env 文件不存在（开发模式可以没有）"
fi
echo ""

echo "9️⃣  快速修复建议..."
echo "-------------------"
echo ""
echo "如果以上检查有任何 ✗ 或 ⚠，请尝试以下命令："
echo ""
echo "  # 1. 清理并重新安装依赖"
echo "  rm -rf node_modules package-lock.json"
echo "  npm install"
echo ""
echo "  # 2. 清理构建产物"
echo "  rm -rf dist release"
echo ""
echo "  # 3. 重新编译"
echo "  npm run build"
echo ""
echo "  # 4. 开发模式运行（自动打开 DevTools）"
echo "  npm run dev"
echo ""
echo "  # 5. 查看控制台错误（重要！）"
echo "  # 在浏览器中打开 http://localhost:5173"
echo "  # 按 F12 打开 DevTools，查看 Console 和 Network 标签"
echo ""

echo "🔍 诊断完成！"
echo "============"
echo ""
echo "💡 提示：如果发现任何错误，请参考 docs/TROUBLESHOOTING.md"
echo ""
