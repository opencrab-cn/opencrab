/**
 * 共享类型定义
 * 
 * 包含所有模型通用的参数类型和配置接口
 */

import { MessageContent, ChatCompletionOptions } from '../main/adapters/model.interface';

/**
 * 扩展的聊天补全选项（包含 Qwen 特有参数）
 */
export interface QwenChatOptions extends ChatCompletionOptions {
  /**
   * 温度参数 (0-2)
   * 控制随机性：较低值更确定，较高值更有创造性
   * @default 1.0
   */
  temperature?: number;
  
  /**
   * Top-p 采样 (0-1)
   * 控制词汇选择：只考虑累积概率前 p% 的词
   * @default 0.8
   */
  top_p?: number;
  
  /**
   * Top-k 采样
   * 仅从概率最高的 k 个词中选择
   * @default undefined (禁用)
   */
  top_k?: number;
  
  /**
   * 重复惩罚系数 (1.0-2.0)
   * 降低重复内容的生成概率
   * @default 1.1
   */
  repetition_penalty?: number;
  
  /**
   * 停止词列表
   * 遇到这些词时停止生成
   */
  stop?: string[];
  
  /**
   * 是否启用流式响应
   */
  stream?: boolean;
}

/**
 * 模型提供商 ID
 */
export type ProviderId = 'aliyun' | 'baidu' | 'iflytek';

/**
 * 模型注册信息
 */
export interface ModelConfig {
  /** 模型 ID */
  modelId: string;
  /** 显示名称 */
  displayName: string;
  /** 提供商 ID */
  providerId: ProviderId;
  /** API Endpoint */
  endpoint: string;
  /** 是否支持视觉 */
  supportsVision: boolean;
  /** 是否支持音频 */
  supportsAudio: boolean;
  /** 最大上下文长度 (tokens) */
  maxContextLength: number;
  /** 默认排序权重 */
  priority: number;
  /** 是否默认启用 */
  enabled: boolean;
}

/**
 * 消息历史中的单条消息
 */
export interface ChatMessageItem {
  /** 消息 ID（客户端生成） */
  id: string;
  /** 角色 */
  role: 'system' | 'user' | 'assistant';
  /** 内容 */
  content: string | MessageContent[];
  /** 时间戳 */
  timestamp: number;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 对话状态
 */
export interface ChatState {
  /** 当前选中的模型 ID */
  currentModelId: string;
  /** 消息历史 */
  messages: ChatMessageItem[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** Token 使用统计 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 发送消息的参数
 */
export interface SendMessageParams {
  /** 消息内容 */
  content: string;
  /** 使用的模型 ID */
  modelId: string;
  /** 聊天选项 */
  options?: QwenChatOptions;
  /** 是否使用流式响应 */
  stream?: boolean;
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 增量文本 */
  content: string;
  /** 是否完成 */
  done: boolean;
  /** 完整响应（仅在 done=true 时） */
  fullContent?: string;
  /** Token 统计（仅在 done=true 时） */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 预定义的模型配置
 */
export const PREDEFINED_MODELS: ModelConfig[] = [
  // 通义千问系列
  {
    modelId: 'qwen-max',
    displayName: '通义千问 Max',
    providerId: 'aliyun',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 6000,
    priority: 100,
    enabled: true,
  },
  {
    modelId: 'qwen-plus',
    displayName: '通义千问 Plus',
    providerId: 'aliyun',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 32000,
    priority: 90,
    enabled: true,
  },
  {
    modelId: 'qwen-turbo',
    displayName: '通义千问 Turbo',
    providerId: 'aliyun',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 6000,
    priority: 80,
    enabled: true,
  },
  // 通义千问视觉模型
  {
    modelId: 'qwen-vl-max',
    displayName: '通义千问 VL Max',
    providerId: 'aliyun',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 8000,
    priority: 70,
    enabled: true,
  },
];

/**
 * 获取模型配置
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return PREDEFINED_MODELS.find(m => m.modelId === modelId);
}

/**
 * 获取提供商的所有可用模型
 */
export function getModelsByProvider(providerId: ProviderId): ModelConfig[] {
  return PREDEFINED_MODELS.filter(
    m => m.providerId === providerId && m.enabled
  ).sort((a, b) => b.priority - a.priority);
}
