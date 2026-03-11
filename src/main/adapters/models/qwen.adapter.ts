/**
 * 通义千问 (Qwen) 模型适配器
 * 
 * 实现阿里云百炼平台的通义千问系列模型调用
 * 支持 OAuth 认证、流式响应、多模态输入
 * 
 * 文档参考:
 * - 阿里云百炼：https://help.aliyun.com/zh/model-studio/
 * - 通义千问 API: https://help.aliyun.com/zh/dashscope/developer-reference/
 */

import {
  IModelAdapter,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  ModelCapabilities,
  ModelError,
  TokenUsage,
} from '../model.interface';
import axios, { AxiosError } from 'axios';
import { aliyunProvider } from '../../auth/providers/aliyun.provider';
import { getModelConfig, QwenChatOptions } from '../../../shared/types';

/**
 * Qwen API 请求体结构
 */
interface QwenRequest {
  model: string;
  input: {
    messages: QwenMessage[];
  };
  parameters: {
    result_format?: 'message' | 'text';
    incremental_output?: boolean;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    repetition_penalty?: number;
    stop?: string[];
    enable_search?: boolean;
  };
}

/**
 * Qwen 消息格式（适配 API 要求）
 */
interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    text?: string;
    image?: string;
  }>;
}

/**
 * Qwen API 响应结构
 */
interface QwenResponse {
  output: {
    text?: string;
    finish_reason?: 'stop' | 'length' | 'null';
    choices?: Array<{
      message: QwenMessage;
      finish_reason: string;
    }>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

/**
 * 通义千问模型适配器实现类
 */
export class QwenModelAdapter implements IModelAdapter {
  private modelId: string;
  private providerId: string;
  private endpoint: string;

  constructor(modelId: string) {
    this.modelId = modelId;
    this.providerId = 'aliyun';
    
    // 获取模型配置
    const config = getModelConfig(modelId);
    if (!config) {
      throw new Error(`未知的模型 ID: ${modelId}`);
    }
    
    this.endpoint = config.endpoint;
  }

  /**
   * 获取模型 ID
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * 获取模型显示名称
   */
  getModelName(): string {
    const config = getModelConfig(this.modelId);
    return config?.displayName || `Qwen (${this.modelId})`;
  }

  /**
   * 获取提供商 ID
   */
  getProvider(): string {
    return this.providerId;
  }

  /**
   * 获取模型能力
   */
  getCapabilities(): ModelCapabilities {
    const config = getModelConfig(this.modelId);
    
    return {
      supportsVision: config?.supportsVision || false,
      supportsAudio: config?.supportsAudio || false,
      supportsFunctionCall: false, // TODO: 后续实现
      maxContextLength: config?.maxContextLength || 6000,
    };
  }

  /**
   * 发送聊天请求（非流式）
   * 
   * @param messages - 对话消息列表
   * @param options - 可选的配置参数
   * @param apiKey - OAuth AccessToken（可选，为空时自动获取）
   * @returns 完整的响应结果
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & QwenChatOptions,
    apiKey?: string
  ): Promise<ChatCompletionResponse> {
    try {
      // 获取 OAuth Token
      const token = await this.getAccessToken(apiKey);
      
      // 构建请求
      const requestBody = this.buildRequestBody(messages, options);
      
      // 发送请求
      const response = await axios.post<QwenResponse>(
        this.endpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-DashScope-SSE': 'disable', // 禁用 SSE
          },
          timeout: 60000, // 60 秒超时
        }
      );

      const qwenResponse = response.data;
      
      // 解析响应
      return this.parseResponse(qwenResponse);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 发送聊天请求（流式响应）
   * 
   * @param messages - 对话消息列表
   * @param options - 可选的配置参数
   * @param apiKey - OAuth AccessToken（可选）
   * @param onChunk - 流式回调函数
   * @returns Promise，在流式传输完成时 resolve
   */
  async chatStream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & QwenChatOptions,
    apiKey?: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<void> {
    try {
      // 获取 OAuth Token
      const token = await this.getAccessToken(apiKey);
      
      // 构建请求
      const requestBody = this.buildRequestBody(messages, {
        ...options,
        stream: true,
      });

      // 使用 fetch API 处理 SSE
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-DashScope-SSE': 'enable',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误：${response.status}`);
      }

      // 读取流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let isDone = false;

      while (!isDone) {
        const { done, value } = await reader.read();
        
        if (done) {
          isDone = true;
          break;
        }

        // 解码 SSE 数据
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            
            // 跳过空数据
            if (!data) continue;

            // 解析 JSON
            try {
              const parsed = JSON.parse(data);
              
              // 提取增量内容
              const deltaContent = this.extractDeltaContent(parsed);
              
              if (deltaContent) {
                fullContent += deltaContent;
                
                // 回调通知
                if (onChunk) {
                  onChunk({
                    content: deltaContent,
                    done: false,
                  });
                }
              }

              // 检查是否完成
              if (parsed.output?.finish_reason === 'stop') {
                const usage = this.parseUsage(parsed.usage);
                
                if (onChunk) {
                  onChunk({
                    content: '',
                    done: true,
                    fullContent,
                    usage,
                  });
                }
                
                isDone = true;
                break;
              }
            } catch (e) {
              console.warn('[Qwen] 解析 SSE 数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 验证 API Key（OAuth Token）是否有效
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // 使用简单的请求测试令牌有效性
      const testMessages: ChatMessage[] = [
        { role: 'user', content: '你好' }
      ];

      const response = await this.chat(testMessages, {
        maxTokens: 1,
      }, apiKey);

      return !!response.content;
    } catch (error) {
      console.error('[Qwen] 令牌验证失败:', error);
      return false;
    }
  }

  /**
   * 解析错误对象
   */
  parseError(error: unknown): ModelError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      // 根据状态码分类错误
      if (status === 401 || status === 403) {
        return {
          type: 'auth',
          message: '认证失败：OAuth Token 无效或已过期',
          statusCode: status,
          originalError: error,
        };
      } else if (status === 429) {
        return {
          type: 'rate_limit',
          message: '请求限流：请稍后重试',
          statusCode: status,
          originalError: error,
        };
      } else if (status && status >= 400 && status < 500) {
        return {
          type: 'model_error',
          message: `API 错误：${axiosError.message}`,
          statusCode: status,
          originalError: error,
        };
      }
    }

    // 网络错误
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
      return {
        type: 'network',
        message: '网络错误：请检查网络连接',
        originalError: error,
      };
    }

    // 未知错误
    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : '未知错误',
      originalError: error,
    };
  }

  /**
   * 获取 OAuth AccessToken
   */
  private async getAccessToken(providedToken?: string): Promise<string> {
    if (providedToken) {
      return providedToken;
    }

    // 从 auth 模块获取存储的令牌
    const token = await aliyunProvider.loadToken();
    
    if (!token || !token.accessToken) {
      throw new Error('未找到有效的 OAuth Token，请先登录');
    }

    // 检查令牌是否过期
    if (Date.now() >= token.expiresAt) {
      throw new Error('OAuth Token 已过期，请重新登录');
    }

    return token.accessToken;
  }

  /**
   * 构建 API 请求体
   */
  private buildRequestBody(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & QwenChatOptions
  ): QwenRequest {
    // 转换消息格式
    const qwenMessages: QwenMessage[] = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? msg.content 
        : this.convertContentArray(msg.content),
    }));

    return {
      model: this.modelId,
      input: {
        messages: qwenMessages,
      },
      parameters: {
        result_format: 'message',
        incremental_output: true,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.top_p ?? 0.8,
        top_k: options?.top_k,
        max_tokens: options?.maxTokens ?? 2000,
        repetition_penalty: options?.repetition_penalty ?? 1.1,
        stop: options?.stop,
        enable_search: false, // 默认不启用搜索
      },
    };
  }

  /**
   * 转换内容数组为 Qwen 格式
   */
  private convertContentArray(content: any[]): string | Array<{ text?: string; image?: string }> {
    // MVP 阶段仅支持文本
    // TODO: 后续扩展图像、音频等多模态内容
    if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text') {
          return { text: item.text };
        } else if (item.type === 'image') {
          return { image: item.data };
        }
        return { text: JSON.stringify(item) };
      });
    }
    
    return String(content);
  }

  /**
   * 解析 API 响应
   */
  private parseResponse(response: QwenResponse): ChatCompletionResponse {
    // 提取文本内容
    let content = '';
    
    if (response.output.text) {
      content = response.output.text;
    } else if (response.output.choices && response.output.choices.length > 0) {
      content = response.output.choices[0].message.content as string;
    }

    return {
      content,
      usage: this.parseUsage(response.usage),
      modelId: this.modelId,
      createdAt: Date.now(),
    };
  }

  /**
   * 解析 Token 使用统计
   */
  private parseUsage(usage: QwenResponse['usage']): TokenUsage {
    return {
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  /**
   * 从 SSE 数据中提取增量内容
   */
  private extractDeltaContent(data: Partial<QwenResponse>): string {
    if (data.output?.choices && data.output.choices.length > 0) {
      const delta = data.output.choices[0].message.content;
      return (delta as string) || '';
    }
    
    if (data.output?.text) {
      return data.output.text;
    }

    return '';
  }

  /**
   * 统一错误处理
   */
  private handleError(error: unknown): Error {
    const modelError = this.parseError(error);
    
    switch (modelError.type) {
      case 'auth':
        return new Error(`认证失败：${modelError.message}`);
      case 'rate_limit':
        return new Error(`请求限流：${modelError.message}`);
      case 'network':
        return new Error(`网络错误：${modelError.message}`);
      case 'model_error':
        return new Error(`模型错误：${modelError.message}`);
      default:
        return new Error(modelError.message);
    }
  }
}

// 导出工厂函数
export function createQwenAdapter(modelId: string): IModelAdapter {
  return new QwenModelAdapter(modelId);
}
