/**
 * 认证相关的 React Hook
 * 
 * 封装 IPC 调用，提供响应式的认证状态管理
 * 支持登录、登出、状态检查和自动刷新
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 用户信息类型定义
 */
export interface UserInfo {
  userId?: string;
  username?: string;
  email?: string;
  avatar?: string;
}

/**
 * OAuth 令牌类型
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 认证状态接口
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  token: OAuthToken | null;
  needsRefresh: boolean;
  error?: string;
}

/**
 * useAuth Hook 返回值类型
 */
export interface UseAuthReturn {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 用户信息 */
  user: UserInfo | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 登录函数 */
  login: (providerId: string) => Promise<void>;
  /** 登出函数 */
  logout: (providerId: string) => Promise<void>;
  /** 刷新令牌 */
  refreshToken: (providerId: string) => Promise<void>;
  /** 重新检查认证状态 */
  checkStatus: () => Promise<void>;
}

/**
 * IPC 调用错误类型
 */
interface IpcError {
  message: string;
}

/**
 * 认证相关的 React Hook
 * 
 * @param providerId - OAuth 提供商 ID (如："aliyun")
 * @returns 认证状态和操作函数
 * 
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { isAuthenticated, isLoading, login, logout } = useAuth('aliyun');
 *   
 *   if (isLoading) return <div>加载中...</div>;
 *   
 *   return (
 *     <button onClick={() => isAuthenticated ? logout('aliyun') : login('aliyun')}>
 *       {isAuthenticated ? '退出登录' : '登录'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAuth(providerId: string): UseAuthReturn {
  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // 用户信息
  const [user, setUser] = useState<UserInfo | null>(null);
  // 加载状态
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 令牌信息
  const [token, setToken] = useState<OAuthToken | null>(null);

  /**
   * 检查认证状态
   */
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 调用 IPC 获取认证状态
      const result = await window.electron.ipcRenderer.invoke('auth:getStatus', providerId);
      
      if (result.success && result.status) {
        const status: AuthStatus = result.status;
        setIsAuthenticated(status.isAuthenticated);
        setToken(status.token);
        
        // 如果已认证，获取用户信息
        if (status.isAuthenticated) {
          const userInfoResult = await window.electron.ipcRenderer.invoke('auth:getUserInfo', providerId);
          if (userInfoResult.success && userInfoResult.userInfo) {
            setUser(userInfoResult.userInfo);
          }
        } else {
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('[useAuth] 检查认证状态失败:', err);
      setError(err instanceof Error ? err.message : '检查认证状态失败');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  /**
   * 执行登录
   */
  const login = useCallback(async (providerId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 调用 IPC 执行登录
      const result = await window.electron.ipcRenderer.invoke('auth:login', providerId);
      
      if (result.success && result.token) {
        setToken(result.token);
        setIsAuthenticated(true);
        
        // 登录后获取用户信息
        const userInfoResult = await window.electron.ipcRenderer.invoke('auth:getUserInfo', providerId);
        if (userInfoResult.success && userInfoResult.userInfo) {
          setUser(userInfoResult.userInfo);
        }
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (err) {
      console.error('[useAuth] 登录失败:', err);
      setError(err instanceof Error ? err.message : '登录失败');
      throw err; // 重新抛出错误，让调用者处理
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 执行登出
   */
  const logout = useCallback(async (providerId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 调用 IPC 执行登出
      const result = await window.electron.ipcRenderer.invoke('auth:logout', providerId);
      
      if (result.success) {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      } else {
        throw new Error(result.error || '登出失败');
      }
    } catch (err) {
      console.error('[useAuth] 登出失败:', err);
      setError(err instanceof Error ? err.message : '登出失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 刷新令牌
   */
  const refreshToken = useCallback(async (providerId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 调用 IPC 刷新令牌
      const result = await window.electron.ipcRenderer.invoke('auth:refreshToken', providerId);
      
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        throw new Error(result.error || '刷新失败');
      }
    } catch (err) {
      console.error('[useAuth] 刷新令牌失败:', err);
      setError(err instanceof Error ? err.message : '刷新失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 组件挂载时检查认证状态
   */
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  /**
   * 定期检查令牌是否即将过期
   * 在过期前 5 分钟自动刷新
   */
  useEffect(() => {
    if (!token || !token.expiresAt) {
      return undefined;
    }

    // 计算刷新时间 (过期前 5 分钟)
    const refreshTime = token.expiresAt - Date.now() - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      const timer = setTimeout(async () => {
        console.log('[useAuth] 令牌即将过期，自动刷新');
        try {
          await refreshToken(providerId);
        } catch (err) {
          console.error('[useAuth] 自动刷新失败:', err);
          // 刷新失败后强制登出
          setIsAuthenticated(false);
          setUser(null);
          setToken(null);
        }
      }, refreshTime);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [token, providerId, refreshToken]);

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    checkStatus,
  };
}

/**
 * 简化的认证状态检查 Hook
 * 仅用于快速检查认证状态，不包含完整功能
 * 
 * @param providerId - OAuth 提供商 ID
 * @returns 是否已认证
 */
export function useAuthStatus(providerId: string): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('auth:getStatus', providerId);
        setIsAuthenticated(result.success && result.status?.isAuthenticated);
      } catch (err) {
        console.error('[useAuthStatus] 检查失败:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [providerId]);

  return isAuthenticated;
}
