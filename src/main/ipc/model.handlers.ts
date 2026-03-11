/**
 * 模型相关的 IPC 处理器
 * 
 * 处理渲染进程发起的所有模型调用请求
 * 支持多模型路由、流式响应、错误处理
 */

import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { createQwenAdapter } from '../adapters/models/qwen.adapter';
import { IModelAdapter, ChatMessage, ChatCompletionOptions, StreamChunk } from '../adapters/model.interface';
import { QwenChatOptions } from '../../shared/types';

/**
 * 模型适配器缓存
 * 避免重复创建实例
 */
const adapterCache: Map<string, IModelAdapter> = new Map();

/**
 * 获取或创建模型适配器
 */
function getOrCreateAdapter(modelId: string): IModelAdapter {
  // 检查缓存
  const cached = adapterCache.get(modelId);
  if (cached) {
    return cached;
  }

  // 根据模型 ID 创建对应的适配器
  let adapter: IModelAdapter;

  if (modelId.startsWith('qwen')) {
    adapter = createQwenAdapter(modelId);
  } else {
    throw new Error(`不支持的模型：${modelId}`);
  }

  // 存入缓存
  adapterCache.set(modelId, adapter);
  return adapter;
}

/**
 * 可用的模型列表
 */
interface ModelInfo {
  modelId: string;
  displayName: string;
  provider: string;
  capabilities: {
    supportsVision: boolean;
    supportsAudio: boolean;
    maxContextLength: number;
  };
}

/**
 * 注册所有模型相关的 IPC 处理器
 */
export function setupModelIpcHandlers(): void {
  /**
   * 获取可用模型列表
   */
  ipcMain.handle('model:list', async (): Promise<{
    success: boolean;
    models?: ModelInfo[];
    error?: string;
  }> => {
    try {
      // TODO: 从配置文件加载所有可用模型
      const models: ModelInfo[] = [
        {
          modelId: 'qwen-max',
          displayName: '通义千问 Max',
          provider: 'aliyun',
          capabilities: {
            supportsVision: false,
            supportsAudio: false,
            maxContextLength: 6000,
          },
        },
        {
          modelId: 'qwen-plus',
          displayName: '通义千问 Plus',
          provider: 'aliyun',
          capabilities: {
            supportsVision: false,
            supportsAudio: false,
            maxContextLength: 32000,
          },
        },
        {
          modelId: 'qwen-turbo',
          displayName: '通义千问 Turbo',
          provider: 'aliyun',
          capabilities: {
            supportsVision: false,
            supportsAudio: false,
            maxContextLength: 6000,
          },
        },
        {
          modelId: 'qwen-vl-max',
          displayName: '通义千问 VL Max',
          provider: 'aliyun',
          capabilities: {
            supportsVision: true,
            supportsAudio: false,
            maxContextLength: 8000,
          },
        },
      ];

      return {
        success: true,
        models,
      };
    } catch (error) {
      console.error('[IPC] 获取模型列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取模型列表失败',
      };
    }
  });

  /**
   * 非流式聊天请求
   * @param payload - 包含 messages, modelId, options
   */
  ipcMain.handle('model:chat', async (_event: IpcMainInvokeEvent, payload: {
    messages: ChatMessage[];
    modelId: string;
    options?: ChatCompletionOptions & QwenChatOptions;
  }): Promise<{
    success: boolean;
    response?: {
      content: string;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      modelId: string;
    };
    error?: string;
  }> => {
    try {
      console.log('[IPC] 模型聊天请求:', payload.modelId);

      // 验证参数
      if (!payload.messages || !Array.isArray(payload.messages)) {
        throw new Error('消息列表无效');
      }

      if (!payload.modelId || typeof payload.modelId !== 'string') {
        throw new Error('模型 ID 无效');
      }

      // 获取适配器
      const adapter = getOrCreateAdapter(payload.modelId);

      // 执行聊天
      const response = await adapter.chat(
        payload.messages,
        payload.options
      );

      return {
        success: true,
        response: {
          content: response.content,
          usage: response.usage,
          modelId: response.modelId,
        },
      };
    } catch (error) {
      console.error('[IPC] 模型聊天失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '模型调用失败',
      };
    }
  });

  /**
   * 流式聊天请求
   * @param payload - 包含 messages, modelId, options
   */
  ipcMain.handle('model:stream', async (event: IpcMainInvokeEvent, payload: {
    messages: ChatMessage[];
    modelId: string;
    options?: ChatCompletionOptions & QwenChatOptions;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log('[IPC] 模型流式聊天请求:', payload.modelId);

      // 验证参数
      if (!payload.messages || !Array.isArray(payload.messages)) {
        throw new Error('消息列表无效');
      }

      if (!payload.modelId || typeof payload.modelId !== 'string') {
        throw new Error('模型 ID 无效');
      }

      // 获取发送窗口
      const sender = event.sender;
      const window = BrowserWindow.fromWebContents(sender);
      
      if (!window) {
        throw new Error('无法获取窗口引用');
      }

      // 生成唯一的会话 ID
      const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 获取适配器
      const adapter = getOrCreateAdapter(payload.modelId);

      // 用于累积完整响应
      let fullContent = '';
      let usage: any = undefined;

      // 执行流式调用
      await adapter.chatStream(
        payload.messages,
        payload.options,
        undefined,
        (chunk: StreamChunk) => {
          // 通过 IPC 发送到渲染进程
          if (!chunk.done) {
            // 增量更新
            window.webContents.send('model:stream-chunk', {
              sessionId,
              type: 'chunk',
              content: chunk.content,
            });
          } else {
            // 完成通知
            window.webContents.send('model:stream-chunk', {
              sessionId,
              type: 'done',
              fullContent: chunk.fullContent,
              usage: chunk.usage,
            });
          }
        }
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('[IPC] 模型流式聊天失败:', error);
      
      // 发送错误通知
      const sender = event.sender;
      const window = BrowserWindow.fromWebContents(sender);
      
      if (window) {
        window.webContents.send('model:stream-error', {
          type: 'error',
          message: error instanceof Error ? error.message : '流式调用失败',
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '流式调用失败',
      };
    }
  });

  /**
   * 验证模型访问令牌
   * @param modelId - 模型 ID
   */
  ipcMain.handle('model:validateToken', async (_event: IpcMainInvokeEvent, modelId: string): Promise<{
    success: boolean;
    isValid?: boolean;
    error?: string;
  }> => {
    try {
      const adapter = getOrCreateAdapter(modelId);
      const isValid = await adapter.validateApiKey(''); // 空字符串表示使用存储的令牌
      
      return {
        success: true,
        isValid,
      };
    } catch (error) {
      console.error('[IPC] 令牌验证失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '验证失败',
      };
    }
  });

  /**
   * 获取模型能力信息
   * @param modelId - 模型 ID
   */
  ipcMain.handle('model:getCapabilities', async (_event: IpcMainInvokeEvent, modelId: string): Promise<{
    success: boolean;
    capabilities?: {
      supportsVision: boolean;
      supportsAudio: boolean;
      supportsFunctionCall: boolean;
      maxContextLength: number;
    };
    error?: string;
  }> => {
    try {
      const adapter = getOrCreateAdapter(modelId);
      const capabilities = adapter.getCapabilities();
      
      return {
        success: true,
        capabilities,
      };
    } catch (error) {
      console.error('[IPC] 获取模型能力失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取能力信息失败',
      };
    }
  });
}

/**
 * 清理适配器缓存
 * 可在应用退出时调用
 */
export function cleanupAdapters(): void {
  adapterCache.clear();
  console.log('[Model] 已清理所有适配器缓存');
}
