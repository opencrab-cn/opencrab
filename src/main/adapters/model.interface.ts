/**
 * AI 模型适配层接口定义
 * 
 * 采用 Strategy 模式，每个模型提供商实现统一接口
 * 支持文本、音频、图像全模态输入
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 文本消息内容
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * 图像消息内容
 */
export interface ImageContent {
  type: 'image';
  /** 图像 URL 或 Base64 编码 */
  data: string;
  /** 可选的图像描述 */
  description?: string;
}

/**
 * 音频消息内容
 */
export interface AudioContent {
  type: 'audio';
  /** 音频 URL 或 Base64 编码 */
  data: string;
  /** 音频格式 (mp3, wav, etc.) */
  format?: string;
}

/**
 * 联合类型：支持的所有内容类型
 */
export type MessageContent = TextContent | ImageContent | AudioContent;

/**
 * 对话消息结构
 */
export interface ChatMessage {
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 (支持多模态) */
  content: string | MessageContent[];
  /** 可选的消息名称 (用于 system prompt) */
  name?: string;
}

/**
 * 模型流式响应事件
 */
export interface StreamChunk {
  /** 增量文本内容 */
  content?: string;
  /** 是否完成 */
  done: boolean;
  /** 完整的响应文本 (仅在 done=true 时存在) */
  fullContent?: string;
  /** 使用量统计 (仅在 done=true 时存在) */
  usage?: TokenUsage;
}

/**
 * Token 使用统计
 */
export interface TokenUsage {
  /** 输入 token 数量 */
  promptTokens: number;
  /** 输出 token 数量 */
  completionTokens: number;
  /** 总 token 数量 */
  totalTokens: number;
}

/**
 * 模型完整响应结果
 */
export interface ChatCompletionResponse {
  /** 生成的回复内容 */
  content: string;
  /** Token 使用统计 */
  usage?: TokenUsage;
  /** 模型 ID */
  modelId: string;
  /** 响应创建时间戳 */
  createdAt: number;
}

/**
 * 模型能力配置选项
 */
export interface ModelCapabilities {
  /** 是否支持视觉输入 */
  supportsVision: boolean;
  /** 是否支持音频输入 */
  supportsAudio: boolean;
  /** 是否支持函数调用 */
  supportsFunctionCall: boolean;
  /** 最大上下文长度 (tokens) */
  maxContextLength: number;
}

/**
 * 聊天补全参数配置
 */
export interface ChatCompletionOptions {
  /** 温度参数 (0-2)，控制随机性 */
  temperature?: number;
  /** Top-p 采样 (0-1) */
  topP?: number;
  /** 最大生成 token 数 */
  maxTokens?: number;
  /** 重复惩罚系数 */
  presencePenalty?: number;
  /** 是否使用流式响应 */
  stream?: boolean;
  /** 系统提示词 */
  systemPrompt?: string;
}

/**
 * 错误信息结构
 */
export interface ModelError {
  /** 错误类型 */
  type: 'network' | 'auth' | 'rate_limit' | 'model_error' | 'unknown';
  /** 错误消息 */
  message: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 原始错误对象 */
  originalError?: unknown;
}

/**
 * IModelAdapter 抽象接口
 * 
 * 所有模型提供商必须实现此接口
 * 实现类需遵循 Strategy 模式，便于扩展和维护
 */
export interface IModelAdapter {
  /**
   * 获取模型唯一标识符
   * @returns 模型 ID (如："qwen-max", "ernie-bot", "spark-v3.5")
   */
  getModelId(): string;

  /**
   * 获取模型显示名称
   * @returns 中文显示名称 (如："通义千问 Max", "文心一言 4.0")
   */
  getModelName(): string;

  /**
   * 获取模型提供商
   * @returns 提供商 ID (如："aliyun", "baidu", "iflytek")
   */
  getProvider(): string;

  /**
   * 获取模型能力信息
   * @returns 模型能力配置
   */
  getCapabilities(): ModelCapabilities;

  /**
   * 发送聊天请求 (非流式)
   * 
   * @param messages - 对话消息列表
   * @param options - 可选的配置参数
   * @param apiKey - API 密钥或 OAuth token
   * @returns 完整的响应结果
   */
  chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string
  ): Promise<ChatCompletionResponse>;

  /**
   * 发送聊天请求 (流式响应)
   * 
   * @param messages - 对话消息列表
   * @param options - 可选的配置参数
   * @param apiKey - API 密钥或 OAuth token
   * @param onChunk - 流式回调函数，接收增量响应
   * @returns Promise，在流式传输完成时 resolve
   */
  chatStream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
    apiKey?: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<void>;

  /**
   * 验证 API 密钥/OAuth Token 是否有效
   * 
   * @param apiKey - API 密钥或 OAuth token
   * @returns 密钥是否有效
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * 获取当前错误对象的标准化格式
   * 
   * @param error - 原始错误对象
   * @returns 标准化的错误信息
   */
  parseError(error: unknown): ModelError;
}

/**
 * 模型注册信息
 * 用于在应用启动时动态注册可用的模型
 */
export interface ModelRegistration {
  /** 模型适配器实例 */
  adapter: IModelAdapter;
  /** 是否默认启用 */
  enabled: boolean;
  /** 排序权重 (数字越大越靠前) */
  priority: number;
}
