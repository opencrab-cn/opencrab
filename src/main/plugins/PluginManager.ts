/**
 * 插件管理器
 * 
 * 负责插件的生命周期管理：
 * - 加载/卸载插件
 * - 启用/禁用插件
 * - 插件配置管理
 * - 权限控制
 */

import { app, ipcMain, dialog, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PluginManifest, PluginInstance, PluginStatus, PluginPermission } from '../../shared/types/plugins';
import { PluginSandbox } from './PluginSandbox';
import { PluginAPI } from './PluginAPI';

/**
 * 插件管理器类
 */
export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private pluginAPI: PluginAPI;
  private pluginsDir: string;
  private configPath: string;
  private devMode: boolean = process.env.NODE_ENV === 'development';

  constructor() {
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
    this.configPath = path.join(app.getPath('userData'), 'plugin-config.json');
    this.pluginAPI = new PluginAPI();
    
    // 确保插件目录存在
    this.ensurePluginsDir();
  }

  /**
   * 确保插件目录存在
   */
  private async ensurePluginsDir(): Promise<void> {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      console.log('[PluginManager] 插件目录:', this.pluginsDir);
    } catch (error) {
      console.error('[PluginManager] 创建插件目录失败:', error);
    }
  }

  /**
   * 初始化插件系统
   */
  async init(): Promise<void> {
    console.log('[PluginManager] 初始化插件系统...');
    
    // 注册 IPC 处理器
    this.registerIpcHandlers();
    
    // 加载已安装的插件
    await this.loadInstalledPlugins();
    
    console.log(`[PluginManager] 初始化完成，共加载 ${this.plugins.size} 个插件`);
  }

  /**
   * 从目录加载插件
   */
  async loadPlugin(pluginId: string): Promise<PluginInstance | null> {
    const pluginDir = path.join(this.pluginsDir, pluginId);
    
    try {
      // 读取 manifest.json
      const manifestPath = path.join(pluginDir, 'manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);
      
      // 验证 manifest
      if (!this.validateManifest(manifest)) {
        throw new Error('无效的插件清单');
      }
      
      // 创建插件实例
      const instance: PluginInstance = {
        manifest,
        status: PluginStatus.LOADING,
        loadedAt: Date.now(),
      };
      
      this.plugins.set(pluginId, instance);
      
      // 创建沙箱环境
      const sandbox = new PluginSandbox(instance, this.pluginAPI);
      this.sandboxes.set(pluginId, sandbox);
      
      // 加载插件代码
      await this.loadPluginCode(instance, pluginDir);
      
      instance.status = PluginStatus.ENABLED;
      instance.lastActivatedAt = Date.now();
      
      console.log(`[PluginManager] 插件加载成功：${pluginId}`);
      return instance;
      
    } catch (error) {
      console.error(`[PluginManager] 加载插件失败 [${pluginId}]:`, error);
      
      const instance = this.plugins.get(pluginId);
      if (instance) {
        instance.status = PluginStatus.ERROR;
        instance.error = error instanceof Error ? error.message : '未知错误';
      }
      
      return null;
    }
  }

  /**
   * 验证插件清单
   */
  private validateManifest(manifest: PluginManifest): boolean {
    const requiredFields = ['id', 'name', 'version', 'main', 'permissions'];
    
    for (const field of requiredFields) {
      if (!(manifest as any)[field]) {
        console.error(`[PluginManager] 缺少必需字段：${field}`);
        return false;
      }
    }
    
    // 验证版本号格式（semver）
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(manifest.version)) {
      console.error('[PluginManager] 版本号格式错误');
      return false;
    }
    
    return true;
  }

  /**
   * 加载插件代码
   */
  private async loadPluginCode(instance: PluginInstance, pluginDir: string): Promise<void> {
    const mainPath = path.join(pluginDir, instance.manifest.main);
    
    try {
      // 在沙箱中执行插件代码
      const sandbox = this.sandboxes.get(instance.manifest.id);
      if (!sandbox) {
        throw new Error('沙箱未创建');
      }
      
      await sandbox.load(mainPath);
      
    } catch (error) {
      throw new Error(`加载插件代码失败：${error}`);
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return false;
    }
    
    try {
      // 调用插件的 unload 钩子
      const sandbox = this.sandboxes.get(pluginId);
      if (sandbox) {
        await sandbox.unload();
      }
      
      // 删除插件文件
      const pluginDir = path.join(this.pluginsDir, pluginId);
      await fs.rm(pluginDir, { recursive: true, force: true });
      
      // 清理内存
      this.plugins.delete(pluginId);
      this.sandboxes.delete(pluginId);
      
      console.log(`[PluginManager] 插件已卸载：${pluginId}`);
      return true;
      
    } catch (error) {
      console.error(`[PluginManager] 卸载插件失败 [${pluginId}]:`, error);
      return false;
    }
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance || instance.status !== PluginStatus.DISABLED) {
      return false;
    }
    
    try {
      instance.status = PluginStatus.ENABLED;
      instance.lastActivatedAt = Date.now();
      
      const sandbox = this.sandboxes.get(pluginId);
      if (sandbox) {
        await sandbox.enable();
      }
      
      console.log(`[PluginManager] 插件已启用：${pluginId}`);
      return true;
      
    } catch (error) {
      console.error(`[PluginManager] 启用插件失败 [${pluginId}]:`, error);
      instance.status = PluginStatus.ERROR;
      return false;
    }
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance || instance.status !== PluginStatus.ENABLED) {
      return false;
    }
    
    try {
      instance.status = PluginStatus.DISABLED;
      
      const sandbox = this.sandboxes.get(pluginId);
      if (sandbox) {
        await sandbox.disable();
      }
      
      console.log(`[PluginManager] 插件已禁用：${pluginId}`);
      return true;
      
    } catch (error) {
      console.error(`[PluginManager] 禁用插件失败 [${pluginId}]:`, error);
      return false;
    }
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取启用的插件
   */
  getEnabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter(p => p.status === PluginStatus.ENABLED);
  }

  /**
   * 获取插件实例
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 更新插件配置
   */
  async updatePluginConfig(pluginId: string, config: Record<string, any>): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return false;
    }
    
    try {
      // 合并配置
      const currentConfig = await this.getPluginConfig(pluginId);
      const newConfig = { ...currentConfig, ...config };
      
      // 保存到配置文件
      const allConfigs = await this.loadAllConfigs();
      allConfigs[pluginId] = newConfig;
      await fs.writeFile(this.configPath, JSON.stringify(allConfigs, null, 2));
      
      // 通知插件配置已更新
      const sandbox = this.sandboxes.get(pluginId);
      if (sandbox) {
        await sandbox.onConfigChange(newConfig);
      }
      
      console.log(`[PluginManager] 插件配置已更新：${pluginId}`);
      return true;
      
    } catch (error) {
      console.error(`[PluginManager] 更新配置失败 [${pluginId}]:`, error);
      return false;
    }
  }

  /**
   * 获取插件配置
   */
  async getPluginConfig(pluginId: string): Promise<Record<string, any>> {
    const configs = await this.loadAllConfigs();
    const instance = this.plugins.get(pluginId);
    
    // 返回用户配置 + 默认配置
    return {
      ...instance?.manifest.defaultConfig,
      ...configs[pluginId],
    };
  }

  /**
   * 加载所有配置
   */
  private async loadAllConfigs(): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // 配置文件不存在或解析失败
      return {};
    }
  }

  /**
   * 加载已安装的插件
   */
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(entry.name);
        }
      }
    } catch (error) {
      console.error('[PluginManager] 扫描插件目录失败:', error);
    }
  }

  /**
   * 注册 IPC 处理器
   */
  private registerIpcHandlers(): void {
    // 获取所有插件
    ipcMain.handle('plugins:getAll', () => {
      return this.getAllPlugins().map(p => ({
        manifest: p.manifest,
        status: p.status,
        error: p.error,
      }));
    });

    // 启用插件
    ipcMain.handle('plugins:enable', async (_, pluginId: string) => {
      return await this.enablePlugin(pluginId);
    });

    // 禁用插件
    ipcMain.handle('plugins:disable', async (_, pluginId: string) => {
      return await this.disablePlugin(pluginId);
    });

    // 卸载插件
    ipcMain.handle('plugins:unload', async (_, pluginId: string) => {
      return await this.unloadPlugin(pluginId);
    });

    // 获取插件配置
    ipcMain.handle('plugins:getConfig', async (_, pluginId: string) => {
      return await this.getPluginConfig(pluginId);
    });

    // 更新插件配置
    ipcMain.handle('plugins:updateConfig', async (_, pluginId: string, config: Record<string, any>) => {
      return await this.updatePluginConfig(pluginId, config);
    });

    // 请求权限
    ipcMain.handle('plugins:requestPermission', async (_, pluginId: string, permission: PluginPermission) => {
      const instance = this.plugins.get(pluginId);
      if (!instance) {
        return false;
      }

      // 检查是否在 manifest 中声明
      if (!instance.manifest.permissions.includes(permission)) {
        console.warn(`[PluginManager] 插件未声明权限：${permission}`);
        return false;
      }

      // 显示对话框请求用户确认
      const { response } = await dialog.showMessageBox({
        type: 'question',
        buttons: ['允许', '拒绝'],
        title: '权限请求',
        message: `插件 "${instance.manifest.name}" 请求使用"${permission}"权限`,
        detail: '是否允许此插件访问该功能？',
      });

      return response === 0;
    });
  }
}

// 导出单例实例
export const pluginManager = new PluginManager();
