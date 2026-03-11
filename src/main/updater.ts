/**
 * 自动更新模块
 * 
 * 集成 electron-updater，实现：
 * - 自动检查更新
 * - 后台下载
 * - 提示重启安装
 * - 支持静默安装
 * - 更新日志展示
 * - 失败回滚机制
 */

import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater, ProgressInfo, UpdateInfo } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * 更新状态枚举
 */
export enum UpdateStatus {
  /** 空闲状态 */
  IDLE = 'idle',
  /** 正在检查更新 */
  CHECKING = 'checking',
  /** 发现可用更新 */
  AVAILABLE = 'available',
  /** 正在下载更新 */
  DOWNLOADING = 'downloading',
  /** 下载完成，等待重启 */
  DOWNLOADED = 'downloaded',
  /** 没有可用更新 */
  NO_UPDATE = 'no-update',
  /** 更新错误 */
  ERROR = 'error',
}

/**
 * 更新信息接口
 */
export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  releaseNotes?: string | null;
  progress?: number;
  error?: string;
  downloadedFile?: string;
}

/**
 * 自动更新管理器类
 */
class UpdaterManager {
  private mainWindow: BrowserWindow | null = null;
  private state: UpdateState = {
    status: UpdateStatus.IDLE,
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 小时

  /**
   * 初始化自动更新
   */
  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    // 配置自动更新
    autoUpdater.autoDownload = true; // 自动下载
    autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装
    autoUpdater.allowDowngrade = false; // 不允许降级
    autoUpdater.fullChangelog = true; // 获取完整更新日志
    
    // 禁用开发环境自动检查
    if (process.env.NODE_ENV === 'development') {
      autoUpdater.autoDownload = false;
      console.log('[Updater] 开发环境，禁用自动更新');
    }

    // 绑定事件监听器
    this.bindEvents();

    // 启动定时检查
    this.startPeriodicCheck();
  }

  /**
   * 绑定更新事件
   */
  private bindEvents(): void {
    // 检查开始
    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] 正在检查更新...');
      this.setState({ status: UpdateStatus.CHECKING });
      this.sendUpdateEvent('checking');
    });

    // 有可用更新
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log(`[Updater] 发现新版本：${info.version}`);
      this.setState({
        status: UpdateStatus.AVAILABLE,
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
      this.sendUpdateEvent('available', info);
      
      // 显示更新提示对话框
      this.showUpdateDialog(info);
    });

    // 没有可用更新
    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] 当前已是最新版本');
      this.setState({ status: UpdateStatus.NO_UPDATE });
      this.sendUpdateEvent('not-available');
    });

    // 下载进度
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      const percent = Math.round(progress.percent);
      console.log(`[Updater] 下载进度：${percent}%`);
      this.setState({
        status: UpdateStatus.DOWNLOADING,
        progress: percent,
      });
      this.sendUpdateEvent('progress', progress);
    });

    // 下载完成
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log(`[Updater] 更新已下载：${info.version}`);
      this.setState({
        status: UpdateStatus.DOWNLOADED,
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
      this.sendUpdateEvent('downloaded', info);
      
      // 提示用户重启
      this.showRestartDialog(info);
    });

    // 更新错误
    autoUpdater.on('error', (error: Error) => {
      console.error('[Updater] 更新失败:', error);
      this.setState({
        status: UpdateStatus.ERROR,
        error: error.message,
      });
      this.sendUpdateEvent('error', error);
      
      // 错误回滚逻辑
      this.handleUpdateError(error);
    });
  }

  /**
   * 设置更新状态
   */
  private setState(newState: Partial<UpdateState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * 发送更新事件到渲染进程
   */
  private sendUpdateEvent(event: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:event', {
        event,
        data,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 显示更新提示对话框
   */
  private async showUpdateDialog(info: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return;

    const currentVersion = app.getVersion();
    const newVersion = info.version;

    // 构建更新日志 HTML
    let changelogHtml = '';
    if (info.releaseNotes) {
      if (Array.isArray(info.releaseNotes)) {
        changelogHtml = info.releaseNotes.join('\n');
      } else {
        changelogHtml = info.releaseNotes;
      }
    }

    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${newVersion}`,
      detail: `当前版本：v${currentVersion}\n\n${changelogHtml ? '更新内容：\n' + changelogHtml : ''}`,
      buttons: ['立即更新', '稍后提醒', '忽略此版本'],
      cancelId: 1,
    });

    if (response === 0) {
      // 立即更新
      console.log('[Updater] 用户选择立即更新');
      this.downloadUpdate();
    } else if (response === 2) {
      // 忽略此版本
      console.log('[Updater] 用户选择忽略此版本');
      autoUpdater.ignore = info.version;
    }
    // response === 1: 稍后提醒，不做处理
  }

  /**
   * 显示重启对话框
   */
  private async showRestartDialog(info: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return;

    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `v${info.version} 已下载完成`,
      detail: '需要重启应用以完成更新。是否立即重启？',
      buttons: ['立即重启', '稍后重启'],
      cancelId: 1,
      defaultId: 0,
    });

    if (response === 0) {
      // 立即重启并安装
      console.log('[Updater] 用户选择立即重启');
      this.quitAndInstall();
    }
  }

  /**
   * 处理更新错误
   */
  private async handleUpdateError(error: Error): Promise<void> {
    if (!this.mainWindow) return;

    // 尝试回滚（清除下载的更新文件）
    try {
      const cacheDir = path.join(app.getPath('userData'), 'Cache');
      await fs.rm(cacheDir, { recursive: true, force: true });
      console.log('[Updater] 已清理更新的缓存文件');
    } catch (cleanupError) {
      console.error('[Updater] 清理缓存失败:', cleanupError);
    }

    // 显示错误提示
    await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: '更新失败',
      message: '自动更新过程中发生错误',
      detail: `${error.message}\n\n请稍后重试或手动下载最新版本。`,
      buttons: ['确定'],
    });
  }

  /**
   * 手动检查更新
   */
  async checkForUpdates(): Promise<void> {
    try {
      console.log('[Updater] 手动检查更新');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('[Updater] 检查更新失败:', error);
      this.setState({
        status: UpdateStatus.ERROR,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    try {
      console.log('[Updater] 开始下载更新');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('[Updater] 下载更新失败:', error);
      throw error;
    }
  }

  /**
   * 重启并安装更新
   */
  quitAndInstall(): void {
    console.log('[Updater] 重启并安装更新');
    
    // 设置安装后立即退出
    autoUpdater.quitAndInstall(false, true);
    
    // 如果上面的方法没有生效，手动退出
    setTimeout(() => {
      console.warn('[Updater] quitAndInstall 未响应，手动退出');
      app.quit();
    }, 3000);
  }

  /**
   * 获取当前更新状态
   */
  getState(): UpdateState {
    return { ...this.state };
  }

  /**
   * 启动定时检查
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // 延迟首次检查（避免启动时立即检查）
    setTimeout(() => {
      this.checkForUpdates();
      
      // 定期检查
      this.checkInterval = setInterval(() => {
        this.checkForUpdates();
      }, this.UPDATE_CHECK_INTERVAL);
      
      console.log('[Updater] 已启动定时检查（每 2 小时）');
    }, 30000); // 30 秒后首次检查
  }

  /**
   * 停止定时检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Updater] 已停止定时检查');
    }
  }

  /**
   * 设置更新服务器（用于测试或自定义源）
   */
  setFeedURL(feedUrl: string): void {
    autoUpdater.setFeedURL(feedUrl);
    console.log(`[Updater] 更新源已设置为：${feedUrl}`);
  }
}

// 导出单例实例
export const updaterManager = new UpdaterManager();

/**
 * 导出 IPC 处理器
 */
export function setupUpdaterIpcHandlers(): void {
  import('electron').then(({ ipcMain }) => {
    // 手动检查更新
    ipcMain.handle('updater:check', async () => {
      await updaterManager.checkForUpdates();
      return updaterManager.getState();
    });

    // 下载更新
    ipcMain.handle('updater:download', async () => {
      await updaterManager.downloadUpdate();
      return updaterManager.getState();
    });

    // 重启并安装
    ipcMain.handle('updater:restart', () => {
      updaterManager.quitAndInstall();
      return { success: true };
    });

    // 获取状态
    ipcMain.handle('updater:getState', () => {
      return updaterManager.getState();
    });

    // 取消定时检查
    ipcMain.handle('updater:stopCheck', () => {
      updaterManager.stopPeriodicCheck();
      return { success: true };
    });
  });
}

export default updaterManager;
