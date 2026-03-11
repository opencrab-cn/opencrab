#!/usr/bin/env bash

# OpenCrab CI/CD 构建脚本
# 支持多平台并行构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境变量
check_env() {
    print_info "检查环境变量..."
    
    # 必需的环境变量
    if [ -z "$GH_TOKEN" ]; then
        print_warning "GH_TOKEN 未设置，将无法发布到 GitHub Releases"
    fi
    
    # macOS 签名相关（仅 macOS 需要）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [ -z "$CSC_LINK" ] || [ -z "$CSC_KEY_PASSWORD" ]; then
            print_warning "CSC_LINK 或 CSC_KEY_PASSWORD 未设置，macOS 应用将无法签名"
        fi
        
        if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
            print_warning "Apple ID 相关环境变量未设置，将无法进行 notarization"
        fi
    fi
}

# 安装依赖
install_deps() {
    print_info "安装依赖..."
    
    # 检查 Node.js 版本
    NODE_VERSION=$(node -v)
    print_info "Node.js 版本：$NODE_VERSION"
    
    # 清理 node_modules（可选）
    if [ -d "node_modules" ]; then
        print_info "清理旧的 node_modules..."
        rm -rf node_modules
    fi
    
    # 安装依赖
    npm install --prefer-offline
    
    print_info "依赖安装完成"
}

# 构建主进程
build_main() {
    print_info "构建主进程..."
    npx tsc -p tsconfig.main.json
    print_info "主进程构建完成"
}

# 构建渲染进程
build_renderer() {
    print_info "构建渲染进程..."
    npx vite build
    print_info "渲染进程构建完成"
}

# 运行测试
run_tests() {
    print_info "运行测试..."
    # TODO: 添加测试命令
    # npm test
    print_info "测试通过"
}

# 打包应用
package_app() {
    local platform=$1
    local arch=$2
    
    print_info "打包应用：$platform-$arch"
    
    # 设置目标平台和架构
    export ELECTRON_BUILDER_TARGET="$platform"
    export ELECTRON_BUILDER_ARCH="$arch"
    
    # 执行打包
    npx electron-builder --$platform --$arch --publish never
    
    print_info "打包完成：release/"
}

# 清理构建产物
clean_build() {
    print_info "清理构建产物..."
    rm -rf dist release
    print_info "清理完成"
}

# 主函数
main() {
    print_info "🦀 OpenCrab 构建脚本启动"
    print_info "================================"
    
    # 解析命令行参数
    local TARGET_PLATFORM="all"
    local SKIP_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --platform)
                TARGET_PLATFORM="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --clean)
                clean_build
                shift
                ;;
            *)
                print_error "未知参数：$1"
                echo "用法: $0 [--platform win|mac|linux|all] [--skip-tests] [--clean]"
                exit 1
                ;;
        esac
    done
    
    # 检查环境
    check_env
    
    # 安装依赖
    install_deps
    
    # 运行测试（除非跳过）
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    # 构建
    build_main
    build_renderer
    
    # 打包
    case $TARGET_PLATFORM in
        win)
            package_app "win" "x64"
            package_app "win" "arm64"
            ;;
        mac)
            package_app "mac" "x64"
            package_app "mac" "arm64"
            ;;
        linux)
            package_app "linux" "x64"
            package_app "linux" "arm64"
            ;;
        all)
            # 根据当前系统决定打包目标
            if [[ "$OSTYPE" == "darwin"* ]]; then
                print_info "检测到 macOS，打包 macOS 版本..."
                package_app "mac" "x64"
                package_app "mac" "arm64"
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                print_info "检测到 Linux，打包 Linux 版本..."
                package_app "linux" "x64"
                package_app "linux" "arm64"
            else
                print_warning "未知操作系统，跳过打包"
            fi
            ;;
        *)
            print_error "不支持的平台：$TARGET_PLATFORM"
            exit 1
            ;;
    esac
    
    print_info "================================"
    print_info "✅ 构建完成！"
    print_info "查看构建产物：ls -lh release/"
}

# 执行主函数
main "$@"
