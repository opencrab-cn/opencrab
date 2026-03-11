/**
 * TypeScript 类型声明文件
 * 
 * 为 window.electron 提供类型定义
 * 使渲染进程能够享受 TypeScript 类型检查
 */

import type { ElectronAPI } from '../preload/index';

/**
 * 扩展 Window 接口以包含 electron API
 */
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
