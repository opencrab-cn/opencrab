/**
 * OpenCrab Electron 主进程入口
 * 
 * 核心职责:
 * 1. OAuth 令牌管理 - 安全存储和管理各模型的访问令牌
 * 2. 系统原生能力 - 调用操作系统 API (文件系统、通知等)
 * 3. 模型 API 代理 - 代理所有大模型 API 请求
 * 
 * 架构原则:
 * - 不包含任何 UI 逻辑
 * - 不直接处理用户交互
 * - 通过 IPC 与渲染进程通信
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

// 导入 OAuth 认证相关
import { setupAuthIpcHandlers } from './ipc/auth.handlers';
// 导入模型 IPC 处理器
import { setupModelIpcHandlers } from './ipc/model.handlers';

// 导入模型适配器
// TODO: 实现具体的 Model Adapter
// import { IModelAdapter } from './adapters/model.interface';

// 导入 IPC 处理器
// TODO: 实现 IPC 通道
// import { setupIpcHandlers } from './ipc/ipc.handlers';

/**
 * 主窗口实例
 * 保持全局引用以防止被垃圾回收
 */
let mainWindow: BrowserWindow | null = null;

/**
 * 应用配置
 * TODO: 移至配置文件
 */
const CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
};

/**
 * 创建主窗口
 * 
 * 负责初始化 Electron 渲染进程
 * 配置预加载脚本以暴露安全的 IPC API
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: CONFIG.width,
    height: CONFIG.height,
    minWidth: CONFIG.minWidth,
    minHeight: CONFIG.minHeight,
    title: 'OpenCrab',
    // 使用预加载脚本确保安全性
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, // 启用上下文隔离
      nodeIntegration: false, // 禁用 Node.js 集成以提高安全性
      sandbox: true, // 启用沙盒模式
    },
    // macOS 特定的标题栏行为
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // 优化帧率
    show: false, // 先隐藏，准备好后再显示
    backgroundColor: '#ffffff',
  });

  // 开发环境加载 Vite 开发服务器
  // 生产环境加载打包后的文件
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 开发环境下自动打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  // 窗口准备完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // 窗口关闭事件处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 设置 IPC 通信通道
 * 
 * 建立主进程与渲染进程之间的安全通信桥梁
 * 所有跨进程调用都必须通过此处的处理器
 */
function setupIPC(): void {
  // 注册认证相关的 IPC 处理器
  setupAuthIpcHandlers();
  
  // 注册模型相关的 IPC 处理器
  setupModelIpcHandlers();

  /**
   * 示例：系统能力相关 IPC
   * TODO: 根据需求扩展
   */
  ipcMain.handle('system:get-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    };
  });
}

/**
 * 初始化 OAuth 认证管理器
 * 
 * 负责管理所有 OAuth Provider 的令牌
 * 实现令牌的加密存储和自动刷新
 */
function initAuthManager(): void {
  console.log('[Main] 初始化 OAuth 认证管理器');
  // TODO: 实现令牌管理器
  // - 从安全存储中加载已保存的令牌
  // - 设置定时器检查令牌过期状态
  // - 自动刷新即将过期的令牌
}

/**
 * 初始化模型适配器注册表
 * 
 * 注册所有可用的模型提供商
 * 实现模型的热插拔机制
 */
function initModelAdapters(): void {
  console.log('[Main] 初始化模型适配器注册表');
  // TODO: 注册所有模型适配器
  // - 通义千问 (阿里云)
  // - 文心一言 (百度)
  // - 讯飞星火 (科大讯飞)
  // - 其他中文大模型...
}

/**
 * 应用退出前的清理工作
 */
app.on('will-quit', (event) => {
  console.log('[Main] 应用即将退出，执行清理工作');
  // TODO: 清理资源
  // - 保存所有令牌到安全存储
  // - 关闭所有网络连接
  // - 清理临时文件
  
  // 清理模型适配器缓存
  const { cleanupAdapters } = require('./ipc/model.handlers');
  cleanupAdapters();
});

/**
 * 应用就绪时的初始化流程
 */
app.whenReady().then(() => {
  console.log('[Main] Electron 应用已就绪');
  
  // 初始化各个模块
  initAuthManager();
  initModelAdapters();
  setupIPC();
  createWindow();
});

/**
 * 所有窗口关闭时退出应用
 * macOS 除外 (保持菜单栏图标)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('[Main] 所有窗口已关闭，退出应用');
    app.quit();
  }
});

/**
 * macOS 激活应用时重新创建窗口
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('[Main] macOS 激活应用，重新创建窗口');
    createWindow();
  }
});

/**
 * 应用退出前的清理工作
 */
app.on('will-quit', (event) => {
  console.log('[Main] 应用即将退出，执行清理工作');
  // TODO: 清理资源
  // - 保存所有令牌到安全存储
  // - 关闭所有网络连接
  // - 清理临时文件
});

/**
 * 导出主窗口引用供其他模块使用
 * 注意：需谨慎使用以避免内存泄漏
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 导出 IPC 设置函数供测试使用
 */
export { setupIPC };
