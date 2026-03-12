#!/bin/bash

# OpenCrab 一键构建 + 启动桌面版脚本
# 支持 macOS / Linux 系统

set -e

# 是否启用开发者工具（用于调试白屏问题）
DEV_MODE=false
if [[ "$1" == "--dev" || "$1" == "-d" ]]; then
    DEV_MODE=true
    echo "💡 开发者模式已启用（应用将自动打开开发者工具）"
fi

echo "🦀 =========================================="
echo "🦀 OpenCrab 一键构建 + 启动桌面版"
echo "🦀 =========================================="
echo ""

# 检测操作系统
OS="$(uname -s)"
case "$OS" in
    Darwin)
        echo "✅ 检测到 macOS 系统"
        PLATFORM="mac"
        ;;
    Linux)
        echo "✅ 检测到 Linux 系统"
        PLATFORM="linux"
        ;;
    *)
        echo "❌ 不支持的操作系统：$OS"
        echo "💡 本脚本仅支持 macOS 和 Linux"
        exit 1
        ;;
esac

echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"
echo "✅ npm 版本：$(npm -v)"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  未检测到 node_modules，开始安装依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi
echo ""

# 构建项目
echo "🔨 开始构建项目..."
echo "   1. 编译 TypeScript"
echo "   2. 构建 Vite 资源"
npm run build
echo "✅ 构建完成"
echo ""

# 打包桌面应用
echo "📦 开始打包桌面应用 ($PLATFORM)..."
npm run dist
echo "✅ 打包完成"
echo ""

# 查找并启动应用
echo "🚀 启动桌面应用..."
case "$PLATFORM" in
    mac)
        # 在 release 目录中查找 .app 文件
        APP_PATH=$(find release -name "*.app" -type d | head -n 1)
        if [ -n "$APP_PATH" ]; then
            echo "✅ 找到应用：$APP_PATH"
            echo "💡 如果应用白屏，请检查："
            echo "   1. 开发者工具中的控制台错误 (Cmd+Option+I)"
            echo "   2. 主进程日志输出"
            open "$APP_PATH"
        else
            echo "❌ 未找到 .app 文件"
            exit 1
        fi
        ;;
    linux)
        # 在 release 目录中查找 AppImage 文件
        APPIMAGE_PATH=$(find release -name "*.AppImage" -type f | head -n 1)
        if [ -n "$APPIMAGE_PATH" ]; then
            echo "✅ 找到应用：$APPIMAGE_PATH"
            chmod +x "$APPIMAGE_PATH"
            "$APPIMAGE_PATH" &
        else
            echo "❌ 未找到 AppImage 文件"
            exit 1
        fi
        ;;
esac

echo ""
echo "🦀 =========================================="
echo "🦀 构建并启动完成！"
echo "🦀 =========================================="
echo ""
echo "💡 应用已在后台运行"
echo "💡 如需重新构建，请关闭应用后再次运行此脚本"
echo ""
echo "🔍 如果遇到白屏问题："
echo "   1. 按 Cmd+Option+I 打开开发者工具查看错误"
echo "   2. 使用开发者模式重新运行：./start-desktop.sh --dev"
echo "   3. 检查控制台输出的详细错误信息"
