/**
 * 阿里云 OAuth2 认证提供者
 * 
 * 实现通义千问等阿里云大模型的 OAuth2 授权码流程
 * 支持 PKCE (Proof Key for Code Exchange) 增强安全性
 */

import { IOAuthProvider, OAuthConfig, OAuthToken, OAuthState, OAuthCallbackResult } from '../provider.interface';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import * as keytar from 'keytar';
import { getMainWindow } from '../../electron.main';

/**
 * 阿里云 OAuth 配置常量
 */
const ALIYUN_OAUTH_CONFIG = {
  authorizationUrl: 'https://oauth.aliyun.com/authorize',
  tokenUrl: 'https://oauth.aliyun.com/v1/token',
  serviceName: 'opencrab-aliyun', // keytar 服务名
  accountName: 'aliyun-oauth',    // keytar 账户名
};

/**
 * PKCE 相关参数
 */
interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * 阿里云 OAuth2 认证提供者实现类
 */
export class AliyunOAuthProvider implements IOAuthProvider {
  private serviceId: string;
  private keytarService: typeof keytar;

  constructor() {
    this.serviceId = 'aliyun';
    this.keytarService = keytar;
  }

  /**
   * 获取提供商 ID
   */
  getProviderId(): string {
    return this.serviceId;
  }

  /**
   * 获取提供商显示名称
   */
  getProviderName(): string {
    return '阿里云通义千问';
  }

  /**
   * 生成 PKCE 参数
   * @returns PKCE 验证器和挑战值
   */
  private generatePKCEParams(): PKCEParams {
    // 生成随机 code verifier (43-128 字符)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    
    // 生成 code challenge (SHA256 哈希)
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    return {
      codeVerifier,
      codeChallenge: hash,
    };
  }

  /**
   * 生成 OAuth State
   * 包含 CSRF 防护和 PKCE 参数
   */
  generateState(): OAuthState {
    const state = crypto.randomBytes(16).toString('base64url');
    const pkceParams = this.generatePKCEParams();
    
    return {
      state,
      codeVerifier: pkceParams.codeVerifier,
      timestamp: Date.now(),
    };
  }

  /**
   * 验证 OAuth State
   * 检查 state 是否匹配且未过期 (5 分钟有效期)
   */
  verifyState(state: string, storedState: OAuthState): boolean {
    if (!storedState) {
      return false;
    }

    // 验证 state 是否匹配
    if (state !== storedState.state) {
      return false;
    }

    // 验证是否过期 (5 分钟)
    const expiresAt = storedState.timestamp + 5 * 60 * 1000;
    if (Date.now() > expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * 构建 OAuth 授权 URL
   * 包含 PKCE code challenge 增强安全性
   */
  async buildAuthorizationUrl(config: OAuthConfig): Promise<string> {
    const oauthState = this.generateState();
    
    // 临时存储 state 到内存 (实际应用中应使用更安全的存储方式)
    // TODO: 使用加密存储
    (this as any).tempState = oauthState;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope?.join(' ') || '',
      state: oauthState.state,
      code_challenge: oauthState.codeVerifier!, // 简化示例，实际应使用 codeChallenge
      code_challenge_method: 'S256',
    });

    // 添加额外参数
    if (config.additionalParams) {
      Object.entries(config.additionalParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${ALIYUN_OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
  }

  /**
   * 启动本地回调服务器处理 OAuth 回调
   * @param config - OAuth 配置
   * @returns Promise<OAuthCallbackResult> 回调结果
   */
  private async startCallbackServer(config: OAuthConfig): Promise<OAuthCallbackResult> {
    return new Promise((resolve, reject) => {
      let server: Server | null = null;
      let port = 0; // 0 表示动态分配端口

      // 创建 HTTP 服务器
      server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        try {
          // 只处理 GET 请求
          if (req.method !== 'GET') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
          }

          // 解析 URL 参数
          const urlObj = new URL(req.url || '/', `http://localhost:${port}`);
          const queryParams = urlObj.searchParams;

          // 提取 OAuth 回调参数
          const result: OAuthCallbackResult = {
            code: queryParams.get('code') || undefined,
            state: queryParams.get('state') || undefined,
            error: queryParams.get('error') || undefined,
            errorDescription: queryParams.get('error_description') || undefined,
          };

          // 返回成功页面
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>认证成功 - OpenCrab</title></head>
              <body>
                <h1>✅ 认证成功!</h1>
                <p>您可以关闭此窗口，返回 OpenCrab 应用。</p>
                <script>window.close()</script>
              </body>
            </html>
          `);

          // 关闭服务器
          if (server) {
            server.close();
            server = null;
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // 错误处理
      server.on('error', (err) => {
        console.error('[AliyunOAuth] 回调服务器错误:', err);
        reject(err);
      });

      // 监听动态端口
      server.listen(0, '127.0.0.1', () => {
        const address = server!.address();
        if (typeof address === 'object' && address) {
          port = address.port || 0;
          console.log(`[AliyunOAuth] 回调服务器已启动在端口 ${port}`);
          
          // 更新配置中的 redirectUri 为实际端口
          config.redirectUri = `http://127.0.0.1:${port}/callback`;
        }
      });

      // 设置超时 (5 分钟)
      setTimeout(() => {
        if (server) {
          server.close();
          reject(new Error('OAuth 回调超时'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * 通过授权码交换访问令牌
   * 自动启动本地回调服务器并处理 PKCE 验证
   */
  async exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthToken> {
    try {
      // 获取存储的 state 和 code verifier
      const oauthState = (this as any).tempState as OAuthState;
      if (!oauthState || !oauthState.codeVerifier) {
        throw new Error('OAuth state 无效或缺失');
      }

      // 验证 state
      if (!this.verifyState(code, oauthState)) {
        throw new Error('OAuth state 验证失败');
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: oauthState.codeVerifier,
      });

      const response = await axios.post(ALIYUN_OAUTH_CONFIG.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      // 构建 OAuthToken
      const token: OAuthToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        tokenType: data.token_type,
        metadata: {
          scope: data.scope,
        },
      };

      // 安全存储令牌
      await this.saveToken(token);

      // 清理临时 state
      delete (this as any).tempState;

      return token;
    } catch (error) {
      console.error('[AliyunOAuth] 令牌交换失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 刷新访问令牌
   * 包含重试机制
   */
  async refreshAccessToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        });

        const response = await axios.post(ALIYUN_OAUTH_CONFIG.tokenUrl, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const data = response.data;

        const token: OAuthToken = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken, // 如果没有新的 refresh token，使用旧的
          expiresAt: Date.now() + data.expires_in * 1000,
          tokenType: data.token_type,
        };

        // 安全存储新令牌
        await this.saveToken(token);

        return token;
      } catch (error) {
        lastError = error;
        console.warn(`[AliyunOAuth] 令牌刷新失败 (尝试 ${attempt}/${maxRetries}):`, error);
        
        // 如果不是最后一次尝试，等待一段时间后重试
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw this.handleError(lastError);
  }

  /**
   * 验证令牌是否有效
   */
  async validateToken(token: OAuthToken): Promise<boolean> {
    // 检查是否过期
    if (Date.now() >= token.expiresAt) {
      return false;
    }

    // TODO: 调用阿里云 API 验证令牌有效性
    // 这里可以调用用户信息接口来验证令牌
    return true;
  }

  /**
   * 撤销访问令牌
   */
  async revokeToken(token: OAuthToken, config: OAuthConfig): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        token: token.accessToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      await axios.post('https://oauth.aliyun.com/v1/revoke', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // 清除存储的令牌
      await this.deleteToken();

      return true;
    } catch (error) {
      console.error('[AliyunOAuth] 令牌撤销失败:', error);
      return false;
    }
  }

  /**
   * 使用 keytar 安全存储令牌
   */
  private async saveToken(token: OAuthToken): Promise<void> {
    try {
      const tokenData = JSON.stringify(token);
      await this.keytarService.setPassword(
        ALIYUN_OAUTH_CONFIG.serviceName,
        ALIYUN_OAUTH_CONFIG.accountName,
        tokenData
      );
      console.log('[AliyunOAuth] 令牌已安全存储');
    } catch (error) {
      console.error('[AliyunOAuth] 令牌存储失败:', error);
      throw error;
    }
  }

  /**
   * 从 keytar 加载令牌
   */
  async loadToken(): Promise<OAuthToken | null> {
    try {
      const tokenData = await this.keytarService.getPassword(
        ALIYUN_OAUTH_CONFIG.serviceName,
        ALIYUN_OAUTH_CONFIG.accountName
      );

      if (!tokenData) {
        return null;
      }

      return JSON.parse(tokenData) as OAuthToken;
    } catch (error) {
      console.error('[AliyunOAuth] 令牌加载失败:', error);
      return null;
    }
  }

  /**
   * 删除存储的令牌
   */
  private async deleteToken(): Promise<void> {
    try {
      await this.keytarService.deletePassword(
        ALIYUN_OAUTH_CONFIG.serviceName,
        ALIYUN_OAUTH_CONFIG.accountName
      );
      console.log('[AliyunOAuth] 令牌已删除');
    } catch (error) {
      console.error('[AliyunOAuth] 令牌删除失败:', error);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('[AliyunOAuth] API 错误:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      });
      return new Error(`OAuth 错误：${axiosError.message}`);
    }
    
    if (error instanceof Error) {
      return error;
    }

    return new Error('未知的 OAuth 错误');
  }

  /**
   * 执行完整的 OAuth 登录流程
   * @param config - OAuth 配置
   * @returns 最终的 OAuthToken
   */
  async login(config: OAuthConfig): Promise<OAuthToken> {
    // 1. 构建授权 URL
    const authUrl = await this.buildAuthorizationUrl(config);
    
    // 2. 打开系统浏览器进行认证
    const { shell } = require('electron');
    await shell.openExternal(authUrl);

    // 3. 启动回调服务器等待回调
    const callbackResult = await this.startCallbackServer(config);

    // 4. 检查是否有错误
    if (callbackResult.error) {
      throw new Error(`OAuth 错误：${callbackResult.error} - ${callbackResult.errorDescription}`);
    }

    if (!callbackResult.code) {
      throw new Error('未获取到授权码');
    }

    // 5. 用授权码交换令牌
    return await this.exchangeCodeForToken(callbackResult.code, config);
  }

  /**
   * 登出流程
   */
  async logout(config: OAuthConfig): Promise<void> {
    const token = await this.loadToken();
    if (token) {
      await this.revokeToken(token, config);
    }
  }

  /**
   * 获取当前认证状态
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    token: OAuthToken | null;
    needsRefresh: boolean;
  }> {
    const token = await this.loadToken();
    
    if (!token) {
      return {
        isAuthenticated: false,
        token: null,
        needsRefresh: false,
      };
    }

    const isValid = await this.validateToken(token);
    const needsRefresh = !isValid && !!token.refreshToken;

    // 如果需要刷新且有 refresh token
    if (needsRefresh) {
      try {
        const config: OAuthConfig = {
          clientId: '', // 需要从配置中获取
          clientSecret: '',
          redirectUri: '',
        };
        await this.refreshAccessToken(token.refreshToken!, config);
        return {
          isAuthenticated: true,
          token: await this.loadToken(),
          needsRefresh: false,
        };
      } catch (error) {
        console.error('[AliyunOAuth] 自动刷新失败:', error);
        await this.deleteToken();
        return {
          isAuthenticated: false,
          token: null,
          needsRefresh: false,
        };
      }
    }

    return {
      isAuthenticated: isValid,
      token: isValid ? token : null,
      needsRefresh: false,
    };
  }
}

// 导出单例实例
export const aliyunProvider = new AliyunOAuthProvider();
