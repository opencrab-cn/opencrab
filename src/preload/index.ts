/**
 * Electron Preload 脚本
 * 
 * 在渲染进程和主进程之间建立安全的通信桥梁
 * 使用 contextBridge 暴露受限的 API 给渲染进程
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * IPC 通道白名单
 * 仅允许注册的通道进行通信，增强安全性
 */
const VALID_CHANNELS = [
  // 认证相关
  'auth:login',
  'auth:logout',
  'auth:getStatus',
  'auth:refreshToken',
  'auth:getUserInfo',
  // 模型相关
  'model:list',
  'model:chat',
  'model:stream',
  'model:validateToken',
  'model:getCapabilities',
  // 系统相关
  'system:get-info',
];

/**
 * 验证通道名称是否合法
 */
function isValidChannel(channel: string): boolean {
  return VALID_CHANNELS.includes(channel);
}

/**
 * 暴露给渲染进程的 API
 */
const electronAPI = {
  /**
   * IPC 渲染器接口
   */
  ipcRenderer: {
    /**
     * 发送一次性消息 (invoke/handle 模式)
     * @param channel - IPC 通道名
     * @param args - 传递的参数
     */
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      if (isValidChannel(channel)) {
        try {
          return await ipcRenderer.invoke(channel, ...args);
        } catch (error) {
          console.error(`[Preload] IPC 调用失败 [${channel}]:`, error);
          throw error;
        }
      } else {
        console.warn(`[Preload] 阻止未授权的 IPC 调用：${channel}`);
        throw new Error(`未授权的 IPC 通道：${channel}`);
      }
    },

    /**
     * 订阅 IPC 消息 (on/off 模式)
     * @param channel - IPC 通道名
     * @param func - 回调函数
     */
    on: (channel: string, func: (...args: unknown[]) => void): (() => void) | undefined => {
      if (isValidChannel(channel)) {
        const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        
        // 返回取消订阅函数
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      } else {
        console.warn(`[Preload] 阻止未授权的 IPC 订阅：${channel}`);
        return undefined;
      }
    },

    /**
     * 移除 IPC 监听器
     * @param channel - IPC 通道名
     * @param func - 回调函数
     */
    removeListener: (channel: string, func: (...args: unknown[]) => void) => {
      if (isValidChannel(channel)) {
        ipcRenderer.removeListener(channel, func);
      }
    },

    /**
     * 一次性监听 IPC 消息
     * @param channel - IPC 通道名
     * @param func - 回调函数
     */
    once: (channel: string, func: (...args: unknown[]) => void) => {
      if (isValidChannel(channel)) {
        const wrapper = (_event: IpcRendererEvent, ...args: unknown[]) => {
          func(...args);
          ipcRenderer.removeListener(channel, wrapper);
        };
        ipcRenderer.once(channel, wrapper);
      }
    },
  },

  /**
   * Electron 平台信息
   */
  platform: {
    /** 操作系统平台 */
    platform: process.platform,
    /** CPU 架构 */
    arch: process.arch,
    /** Node.js 版本 */
    nodeVersion: process.version,
    /** Electron 版本 */
    electronVersion: process.versions.electron,
    /** Chrome 版本 */
    chromeVersion: process.versions.chrome,
  },

  /**
   * 应用信息
   */
  app: {
    /** 应用路径 */
    appPath: process.env.APP_PATH || '',
    /** 是否为开发环境 */
    isDev: process.env.NODE_ENV === 'development',
  },
};

/**
 * 将 API 暴露给渲染进程
 * 渲染进程中可通过 window.electron 访问这些 API
 */
contextBridge.exposeInMainWorld('electron', electronAPI);

/**
 * 导出类型定义供 TypeScript 使用
 */
export type ElectronAPI = typeof electronAPI;
