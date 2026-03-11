/**
 * 插件沙箱环境
 * 
 * 使用 Node.js vm 模块创建隔离的执行环境
 * 限制插件的访问权限，确保安全性
 */

import { vm } from 'node:vm';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PluginInstance } from '../../shared/types/plugins';
import { PluginAPI } from './PluginAPI';

/**
 * 沙箱上下文接口
 */
interface SandboxContext {
  /** console 对象（受限） */
  console: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  
  /** setTimeout/setInterval（受限） */
  setTimeout: typeof setTimeout;
  setInterval: typeof setInterval;
  clearTimeout: typeof clearTimeout;
  clearInterval: typeof clearInterval;
  
  /** Promise/Blob/ArrayBuffer 等全局对象 */
  Promise: typeof Promise;
  Blob: typeof Blob;
  ArrayBuffer: typeof ArrayBuffer;
  
  /** 插件 API 暴露的方法 */
  pluginAPI: any;
  
  /** __dirname 和 __filename */
  __dirname: string;
  __filename: string;
  
  /** require（受限） */
  require: (module: string) => any;
}

/**
 * 插件沙箱类
 */
export class PluginSandbox {
  private instance: PluginInstance;
  private pluginAPI: PluginAPI;
  private context: SandboxContext | null = null;
  private script: vm.Script | null = null;
  private contextifiedObject: vm.Context | null = null;
  private timers: Set<NodeJS.Timeout> = new Set();

  constructor(instance: PluginInstance, pluginAPI: PluginAPI) {
    this.instance = instance;
    this.pluginAPI = pluginAPI;
  }

  /**
   * 加载插件代码
   */
  async load(pluginPath: string): Promise<void> {
    try {
      // 读取插件代码
      const code = await fs.readFile(pluginPath, 'utf-8');
      
      // 创建沙箱上下文
      this.createContext(path.dirname(pluginPath));
      
      // 编译并执行代码
      this.script = new vm.Script(code, {
        filename: pluginPath,
        lineOffset: 0,
        displayErrors: true,
      });
      
      // 在沙箱中执行
      const result = this.script.runInContext(this.contextifiedObject!, {
        timeout: 5000, // 5 秒超时
        displayErrors: true,
      });
      
      // 调用插件的 init 钩子（如果存在）
      if (result && typeof result.init === 'function') {
        await result.init(this.pluginAPI.getExposedAPI());
      }
      
      console.log(`[PluginSandbox] 插件加载成功：${this.instance.manifest.id}`);
      
    } catch (error) {
      console.error(`[PluginSandbox] 加载插件失败:`, error);
      throw error;
    }
  }

  /**
   * 创建沙箱上下文
   */
  private createContext(dirname: string): void {
    const pluginId = this.instance.manifest.id;
    
    // 创建受限的 console
    const limitedConsole = {
      log: (...args: any[]) => {
        console.log(`[Plugin:${pluginId}]`, ...args);
      },
      warn: (...args: any[]) => {
        console.warn(`[Plugin:${pluginId}]`, ...args);
      },
      error: (...args: any[]) => {
        console.error(`[Plugin:${pluginId}]`, ...args);
      },
    };

    // 创建受限的 require
    const limitedRequire = (moduleName: string) => {
      // 白名单机制：只允许 require 特定的安全模块
      const allowedModules = [
        'path',
        'util',
        'events',
        'buffer',
        'stream',
        'querystring',
        'url',
      ];

      if (!allowedModules.includes(moduleName)) {
        throw new Error(`不允许的模块：${moduleName}`);
      }

      return require(moduleName);
    };

    // 包装定时器以跟踪清理
    const wrappedSetTimeout = (fn: Function, delay?: number) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        fn();
      }, delay);
      this.timers.add(timer);
      return timer;
    };

    const wrappedSetInterval = (fn: Function, delay?: number) => {
      const timer = setInterval(() => {
        fn();
      }, delay);
      this.timers.add(timer);
      return timer;
    };

    const wrappedClearTimeout = (timer: NodeJS.Timeout) => {
      this.timers.delete(timer);
      clearTimeout(timer);
    };

    const wrappedClearInterval = (timer: NodeJS.Timeout) => {
      this.timers.delete(timer);
      clearInterval(timer);
    };

    // 构建沙箱上下文
    this.context = {
      console: limitedConsole,
      setTimeout: wrappedSetTimeout,
      setInterval: wrappedSetInterval,
      clearTimeout: wrappedClearTimeout,
      clearInterval: wrappedClearInterval,
      Promise,
      Blob,
      ArrayBuffer,
      pluginAPI: this.pluginAPI.getExposedAPI(),
      __dirname: dirname,
      __filename: path.join(dirname, 'index.js'),
      require: limitedRequire,
    };

    // 创建上下文对象
    this.contextifiedObject = vm.createContext(this.context, {
      name: `Plugin:${pluginId}`,
      codeGeneration: {
        strings: false, // 禁止 eval/new Function
        wasm: false,    // 禁止 WebAssembly
      },
    });
  }

  /**
   * 启用插件
   */
  async enable(): Promise<void> {
    if (this.script && this.contextifiedObject) {
      // 调用 enable 钩子
      const moduleExports = this.context!.pluginAPI.__moduleExports;
      if (moduleExports && typeof moduleExports.enable === 'function') {
        await moduleExports.enable();
      }
    }
  }

  /**
   * 禁用插件
   */
  async disable(): Promise<void> {
    if (this.script && this.contextifiedObject) {
      // 调用 disable 钩子
      const moduleExports = this.context!.pluginAPI.__moduleExports;
      if (moduleExports && typeof moduleExports.disable === 'function') {
        await moduleExports.disable();
      }
    }
  }

  /**
   * 卸载插件
   */
  async unload(): Promise<void> {
    // 清理所有定时器
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();

    // 调用 unload 钩子
    if (this.context) {
      const moduleExports = this.context.pluginAPI.__moduleExports;
      if (moduleExports && typeof moduleExports.unload === 'function') {
        await moduleExports.unload();
      }
    }

    // 清理引用
    this.context = null;
    this.script = null;
    this.contextifiedObject = null;
  }

  /**
   * 配置变更通知
   */
  async onConfigChange(config: Record<string, any>): Promise<void> {
    if (this.context) {
      const moduleExports = this.context.pluginAPI.__moduleExports;
      if (moduleExports && typeof moduleExports.onConfigChange === 'function') {
        await moduleExports.onConfigChange(config);
      }
    }
  }

  /**
   * 调用插件方法
   */
  async invoke(method: string, ...args: any[]): Promise<any> {
    if (!this.context) {
      throw new Error('沙箱未初始化');
    }

    const moduleExports = this.context.pluginAPI.__moduleExports;
    if (!moduleExports || typeof moduleExports[method] !== 'function') {
      throw new Error(`方法不存在：${method}`);
    }

    return await moduleExports[method](...args);
  }
}
