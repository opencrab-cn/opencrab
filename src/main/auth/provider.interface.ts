/**
 * OAuth 认证提供者接口
 * 
 * 定义所有 OAuth 提供商必须实现的标准接口
 * 支持通义、文心、讯飞等中文大模型的免费认证
 */

/**
 * OAuth 令牌信息接口
 * 包含访问令牌及刷新令牌
 */
export interface OAuthToken {
  /** 访问令牌 - 用于 API 请求认证 */
  accessToken: string;
  /** 刷新令牌 - 用于获取新的访问令牌 */
  refreshToken?: string;
  /** 令牌过期时间戳 (毫秒) */
  expiresAt: number;
  /** 令牌类型 (通常为 "Bearer") */
  tokenType?: string;
  /** 额外的令牌元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * OAuth 认证配置项
 */
export interface OAuthConfig {
  /** OAuth 客户端 ID */
  clientId: string;
  /** OAuth 客户端密钥 */
  clientSecret: string;
  /** 重定向 URI */
  redirectUri: string;
  /** 授权范围 */
  scope?: string[];
  /** 额外的 OAuth 参数 */
  additionalParams?: Record<string, string>;
}

/**
 * OAuth 状态信息
 * 用于跟踪认证流程中的状态
 */
export interface OAuthState {
  /** 随机生成的 state 参数，防止 CSRF 攻击 */
  state: string;
  /** PKCE code verifier (如果支持 PKCE) */
  codeVerifier?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * OAuth Provider 抽象接口
 * 
 * 所有模型提供商必须实现此接口以支持 OAuth 认证
 * 实现类需遵循 Strategy 模式，便于扩展和维护
 */
export interface IOAuthProvider {
  /**
   * 获取提供商唯一标识符
   * @returns 提供商 ID (如："aliyun", "baidu", "iflytek")
   */
  getProviderId(): string;

  /**
   * 获取提供商显示名称
   * @returns 中文显示名称 (如："通义千问", "文心一言", "讯飞星火")
   */
  getProviderName(): string;

  /**
   * 构建 OAuth 授权 URL
   * 
   * @param config - OAuth 认证配置
   * @returns 完整的授权页面 URL
   */
  buildAuthorizationUrl(config: OAuthConfig): Promise<string>;

  /**
   * 通过授权码交换访问令牌
   * 
   * @param code - 授权码 (从回调 URL 中获取)
   * @param config - OAuth 认证配置
   * @returns OAuth 令牌信息
   */
  exchangeCodeForToken(code: string, config: OAuthConfig): Promise<OAuthToken>;

  /**
   * 刷新访问令牌
   * 
   * @param refreshToken - 刷新令牌
   * @param config - OAuth 认证配置
   * @returns 新的 OAuth 令牌信息
   */
  refreshAccessToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken>;

  /**
   * 验证当前令牌是否有效
   * 
   * @param token - 当前访问令牌
   * @returns 令牌是否有效
   */
  validateToken(token: OAuthToken): Promise<boolean>;

  /**
   * 撤销访问令牌
   * 
   * @param token - 要撤销的访问令牌
   * @param config - OAuth 认证配置
   * @returns 撤销是否成功
   */
  revokeToken(token: OAuthToken, config: OAuthConfig): Promise<boolean>;

  /**
   * 生成 OAuth state 参数 (用于防止 CSRF)
   * 
   * @returns OAuth 状态信息
   */
  generateState(): OAuthState;

  /**
   * 验证 OAuth state 参数
   * 
   * @param state - 从回调中获取的 state 参数
   * @param storedState - 存储的原始 state 参数
   * @returns state 是否匹配且未过期
   */
  verifyState(state: string, storedState: OAuthState): boolean;
}

/**
 * OAuth 回调结果
 * 用于处理浏览器回调后的数据传输
 */
export interface OAuthCallbackResult {
  /** 授权码 */
  code?: string;
  /** OAuth state 参数 */
  state?: string;
  /** 错误信息 (如果认证失败) */
  error?: string;
  /** 错误描述 */
  errorDescription?: string;
}
