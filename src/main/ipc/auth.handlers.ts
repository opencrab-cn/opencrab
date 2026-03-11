/**
 * 认证相关 IPC 处理器
 * 
 * 处理渲染进程发起的所有认证相关请求
 * 确保通信安全和数据验证
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { aliyunProvider, AliyunOAuthProvider } from '../providers/aliyun.provider';
import { OAuthConfig, OAuthToken } from '../provider.interface';

/**
 * 认证状态接口
 */
interface AuthStatus {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 当前令牌信息 */
  token: OAuthToken | null;
  /** 是否需要刷新 */
  needsRefresh: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 用户信息接口
 */
interface UserInfo {
  /** 用户 ID */
  userId?: string;
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 头像 URL */
  avatar?: string;
}

/**
 * 存储 OAuth 配置
 * TODO: 实际应用中应从配置文件或环境变量读取
 */
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  aliyun: {
    clientId: process.env.ALIYUN_CLIENT_ID || '',
    clientSecret: process.env.ALIYUN_CLIENT_SECRET || '',
    redirectUri: 'http://127.0.0.1:0/callback', // 动态端口
    scope: ['user_info', 'api_access'],
  },
};

/**
 * 认证处理器类
 * 封装所有认证相关的业务逻辑
 */
class AuthHandler {
  private providers: Map<string, AliyunOAuthProvider> = new Map();

  constructor() {
    // 注册所有可用的认证提供商
    this.providers.set('aliyun', aliyunProvider);
  }

  /**
   * 获取认证提供商
   */
  getProvider(providerId: string): AliyunOAuthProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * 执行登录流程
   */
  async login(providerId: string): Promise<OAuthToken> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`不支持的认证提供商：${providerId}`);
    }

    const config = OAUTH_CONFIGS[providerId];
    if (!config || !config.clientId) {
      throw new Error(`缺少 ${providerId} 的 OAuth 配置`);
    }

    // 执行完整的 OAuth 登录流程
    return await provider.login(config);
  }

  /**
   * 执行登出流程
   */
  async logout(providerId: string): Promise<void> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`不支持的认证提供商：${providerId}`);
    }

    const config = OAUTH_CONFIGS[providerId];
    if (!config) {
      throw new Error(`缺少 ${providerId} 的 OAuth 配置`);
    }

    await provider.logout(config);
  }

  /**
   * 获取认证状态
   */
  async getStatus(providerId: string): Promise<AuthStatus> {
    try {
      const provider = this.getProvider(providerId);
      if (!provider) {
        throw new Error(`不支持的认证提供商：${providerId}`);
      }

      const status = await provider.getAuthStatus();
      
      return {
        ...status,
        error: undefined,
      };
    } catch (error) {
      console.error('[AuthHandler] 获取认证状态失败:', error);
      return {
        isAuthenticated: false,
        token: null,
        needsRefresh: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(providerId: string): Promise<OAuthToken> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`不支持的认证提供商：${providerId}`);
    }

    const config = OAUTH_CONFIGS[providerId];
    if (!config) {
      throw new Error(`缺少 ${providerId} 的 OAuth 配置`);
    }

    // 加载当前令牌
    const currentToken = await provider.loadToken();
    if (!currentToken || !currentToken.refreshToken) {
      throw new Error('没有可用的刷新令牌');
    }

    // 执行刷新
    return await provider.refreshAccessToken(currentToken.refreshToken, config);
  }

  /**
   * 获取用户信息
   * TODO: 实现获取用户信息的逻辑
   */
  async getUserInfo(providerId: string): Promise<UserInfo | null> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`不支持的认证提供商：${providerId}`);
    }

    const token = await provider.loadToken();
    if (!token) {
      return null;
    }

    // TODO: 调用 OAuth 提供商的用户信息 API
    // 这里仅返回示例数据
    return {
      userId: 'user_' + Math.random().toString(36).substr(2, 9),
      username: 'OpenCrab User',
      email: 'user@opencrab.example.com',
      avatar: undefined,
    };
  }
}

// 创建全局认证处理器实例
const authHandler = new AuthHandler();

/**
 * 注册所有 IPC 处理器
 * 在主进程启动时调用
 */
export function setupAuthIpcHandlers(): void {
  /**
   * 登录请求
   * @param providerId - 认证提供商 ID
   */
  ipcMain.handle('auth:login', async (_event: IpcMainInvokeEvent, providerId: string): Promise<{
    success: boolean;
    token?: OAuthToken;
    error?: string;
  }> => {
    try {
      console.log(`[IPC] 登录请求：${providerId}`);
      
      // 验证提供商 ID
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('无效的提供商 ID');
      }

      const token = await authHandler.login(providerId);
      
      return {
        success: true,
        token,
      };
    } catch (error) {
      console.error('[IPC] 登录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败',
      };
    }
  });

  /**
   * 登出请求
   * @param providerId - 认证提供商 ID
   */
  ipcMain.handle('auth:logout', async (_event: IpcMainInvokeEvent, providerId: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log(`[IPC] 登出请求：${providerId}`);
      
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('无效的提供商 ID');
      }

      await authHandler.logout(providerId);
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('[IPC] 登出失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登出失败',
      };
    }
  });

  /**
   * 获取认证状态
   * @param providerId - 认证提供商 ID
   */
  ipcMain.handle('auth:getStatus', async (_event: IpcMainInvokeEvent, providerId: string): Promise<{
    success: boolean;
    status?: AuthStatus;
    error?: string;
  }> => {
    try {
      // console.log(`[IPC] 获取认证状态：${providerId}`);
      
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('无效的提供商 ID');
      }

      const status = await authHandler.getStatus(providerId);
      
      return {
        success: true,
        status,
      };
    } catch (error) {
      console.error('[IPC] 获取认证状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取状态失败',
      };
    }
  });

  /**
   * 刷新令牌
   * @param providerId - 认证提供商 ID
   */
  ipcMain.handle('auth:refreshToken', async (_event: IpcMainInvokeEvent, providerId: string): Promise<{
    success: boolean;
    token?: OAuthToken;
    error?: string;
  }> => {
    try {
      console.log(`[IPC] 刷新令牌：${providerId}`);
      
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('无效的提供商 ID');
      }

      const token = await authHandler.refreshToken(providerId);
      
      return {
        success: true,
        token,
      };
    } catch (error) {
      console.error('[IPC] 刷新令牌失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新失败',
      };
    }
  });

  /**
   * 获取用户信息
   * @param providerId - 认证提供商 ID
   */
  ipcMain.handle('auth:getUserInfo', async (_event: IpcMainInvokeEvent, providerId: string): Promise<{
    success: boolean;
    userInfo?: UserInfo;
    error?: string;
  }> => {
    try {
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('无效的提供商 ID');
      }

      const userInfo = await authHandler.getUserInfo(providerId);
      
      if (!userInfo) {
        return {
          success: false,
          error: '未登录或无法获取用户信息',
        };
      }
      
      return {
        success: true,
        userInfo,
      };
    } catch (error) {
      console.error('[IPC] 获取用户信息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取用户信息失败',
      };
    }
  });
}

/**
 * 导出认证处理器供其他模块使用
 */
export { authHandler };
