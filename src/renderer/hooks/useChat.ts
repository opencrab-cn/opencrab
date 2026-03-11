/**
 * 对话管理的 React Hook
 * 
 * 封装聊天状态管理和消息收发逻辑
 * 支持流式响应、错误处理、消息历史管理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, StreamChunk } from '../../main/adapters/model.interface';
import { ChatMessageItem, SendMessageParams, QwenChatOptions } from '../../shared/types';
import { AnyAttachment, buildMultimodalMessage } from '../../shared/types/attachments';

/**
 * 对话状态接口
 */
export interface UseChatState {
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
 * useChat Hook 返回值
 */
export interface UseChatReturn extends UseChatState {
  /** 发送消息 */
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
  /** 清空对话 */
  clearMessages: () => void;
  /** 重新生成最后一条回复 */
  regenerate: (options?: SendMessageOptions) => Promise<void>;
  /** 停止生成 */
  stopGeneration: () => void;
}

/**
 * 发送消息的选项
 */
export interface SendMessageOptions {
  /** 使用的模型 ID */
  modelId?: string;
  /** 聊天配置 */
  chatOptions?: QwenChatOptions;
  /** 是否使用流式响应 */
  stream?: boolean;
  /** 附件列表 */
  attachments?: AnyAttachment[];
}

/**
 * 流式会话的数据结构
 */
interface StreamSession {
  id: string;
  messageId: string;
  abortController: AbortController;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 转换内部消息格式为 API 消息格式
 */
function convertToApiMessages(messages: ChatMessageItem[]): ChatMessage[] {
  return messages
    .filter(msg => !msg.isLoading && !msg.error) // 过滤掉加载中或错误的消息
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
}

/**
 * 对话管理的 React Hook
 * 
 * @param initialModelId - 初始模型 ID
 * @returns 对话状态和操作函数
 * 
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { messages, isLoading, sendMessage, clearMessages } = useChat('qwen-max');
 *   
 *   const handleSubmit = async (content: string) => {
 *     await sendMessage(content);
 *   };
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <Message key={msg.id} {...msg} />
 *       ))}
 *       <button onClick={() => sendMessage('你好')} disabled={isLoading}>
 *         发送
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(initialModelId: string = 'qwen-max'): UseChatReturn {
  // 当前模型 ID（可通过 setState 修改）
  const [currentModelId, setCurrentModelId] = useState(initialModelId);
  
  // 消息历史
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  
  // Token 统计
  const [usage, setUsage] = useState<UseChatState['usage']>();
  
  // 当前流式会话引用
  const currentStreamRef = useRef<StreamSession | null>(null);
  
  // 消息历史引用（用于回调中访问最新值）
  const messagesRef = useRef<ChatMessageItem[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * 添加用户消息
   */
  const addUserMessage = useCallback((content: string): string => {
    const messageId = generateId();
    const newMessage: ChatMessageItem = {
      id: messageId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    return messageId;
  }, []);

  /**
   * 添加助手消息（占位）
   */
  const addAssistantMessage = useCallback((): string => {
    const messageId = generateId();
    const newMessage: ChatMessageItem = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    return messageId;
  }, []);

  /**
   * 更新助手消息
   */
  const updateAssistantMessage = useCallback((messageId: string, content: string, done: boolean = false) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          content: msg.content + content,
          isLoading: !done,
        };
      }
      return msg;
    }));
  }, []);

  /**
   * 标记消息为错误
   */
  const markMessageError = useCallback((messageId: string, errorMsg: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          isLoading: false,
          error: errorMsg,
        };
      }
      return msg;
    }));
  }, []);

  /**
   * 删除最后一条消息
   */
  const removeLastMessage = useCallback(() => {
    setMessages(prev => prev.slice(0, -1));
  }, []);

  /**
   * 发送消息（非流式）
   */
  const sendNonStreamMessage = useCallback(async (
    assistantMessageId: string,
    modelId: string,
    chatOptions?: QwenChatOptions,
    customMessages?: ChatMessage[]
  ) => {
    try {
      // 准备消息历史
      const apiMessages = convertToApiMessages(messagesRef.current);
      
      // 调用 IPC
      const result = await window.electron.ipcRenderer.invoke('model:chat', {
        messages: apiMessages,
        modelId,
        options: chatOptions,
      });

      if (result.success && result.response) {
        // 更新助手消息
        updateAssistantMessage(assistantMessageId, result.response.content, true);
        
        // 更新 Token 统计
        if (result.response.usage) {
          setUsage(result.response.usage);
        }
      } else {
        throw new Error(result.error || '模型调用失败');
      }
    } catch (err) {
      console.error('[useChat] 发送消息失败:', err);
      const errorMsg = err instanceof Error ? err.message : '发送消息失败';
      markMessageError(assistantMessageId, errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateAssistantMessage, markMessageError]);

  /**
   * 发送消息（流式）
   */
  const sendStreamMessage = useCallback(async (
    assistantMessageId: string,
    modelId: string,
    chatOptions?: QwenChatOptions,
    customMessages?: ChatMessage[]
  ) => {
    try {
      // 准备消息历史
      const apiMessages = convertToApiMessages(messagesRef.current);
      
      // 生成会话 ID
      const sessionId = generateId();
      
      // 创建 AbortController（用于取消）
      const abortController = new AbortController();
      currentStreamRef.current = {
        id: sessionId,
        messageId: assistantMessageId,
        abortController,
      };

      // 监听流式响应
      const unsubscribe = window.electron.ipcRenderer.on('model:stream-chunk', (data: any) => {
        if (data.sessionId === sessionId) {
          if (data.type === 'chunk') {
            // 增量更新
            updateAssistantMessage(assistantMessageId, data.content, false);
          } else if (data.type === 'done') {
            // 完成
            updateAssistantMessage(assistantMessageId, '', true);
            
            if (data.usage) {
              setUsage(data.usage);
            }
            
            // 清理
            currentStreamRef.current = null;
            unsubscribe?.();
            setIsLoading(false);
          }
        }
      });

      // 监听错误
      const errorUnsubscribe = window.electron.ipcRenderer.on('model:stream-error', (data: any) => {
        if (data.type === 'error') {
          markMessageError(assistantMessageId, data.message);
          setError(data.message);
          currentStreamRef.current = null;
          errorUnsubscribe?.();
          unsubscribe?.();
          setIsLoading(false);
        }
      });

      // 发起流式请求
      const result = await window.electron.ipcRenderer.invoke('model:stream', {
        messages: apiMessages,
        modelId,
        options: chatOptions,
      });

      if (!result.success) {
        throw new Error(result.error || '流式调用失败');
      }
    } catch (err) {
      console.error('[useChat] 流式消息失败:', err);
      const errorMsg = err instanceof Error ? err.message : '流式发送失败';
      markMessageError(assistantMessageId, errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      currentStreamRef.current = null;
      throw err;
    }
  }, [updateAssistantMessage, markMessageError]);

  /**
   * 发送消息主函数
   */
  const sendMessage = useCallback(async (
    content: string,
    options?: SendMessageOptions
  ) => {
    try {
      // 重置错误状态
      setError(null);
      
      // 验证内容（有附件时可以为空）
      if (!content.trim() && (!options?.attachments || options.attachments.length === 0)) {
        throw new Error('消息内容或附件不能为空');
      }

      // 如果正在加载，先停止
      if (isLoading) {
        console.warn('[useChat] 正在加载中，忽略新的发送请求');
        return;
      }

      setIsLoading(true);

      // 确定参数
      const modelId = options?.modelId || currentModelId;
      const stream = options?.stream ?? true; // 默认使用流式
      const chatOptions = options?.chatOptions;
      const attachments = options?.attachments || [];

      // 构建多模态消息
      let apiMessages: ChatMessage[];
      
      if (attachments.length > 0) {
        // 多模态消息格式
        const lastUserMessage = buildMultimodalMessage(content, attachments);
        const previousMessages = convertToApiMessages(messagesRef.current);
        apiMessages = [...previousMessages, lastUserMessage];
      } else {
        // 纯文本消息
        const userMessage: ChatMessage = {
          role: 'user',
          content: content.trim(),
        };
        const previousMessages = convertToApiMessages(messagesRef.current);
        apiMessages = [...previousMessages, userMessage];
      }
      
      // 添加用户消息到本地历史
      if (content.trim()) {
        addUserMessage(content);
      }
      
      // 添加助手消息（占位）
      const assistantMessageId = addAssistantMessage();

      // 发送消息
      if (stream) {
        await sendStreamMessage(assistantMessageId, modelId, chatOptions, apiMessages);
      } else {
        await sendNonStreamMessage(assistantMessageId, modelId, chatOptions, apiMessages);
      }
    } catch (err) {
      // 错误已在具体函数中处理
      setIsLoading(false);
    }
  }, [
    isLoading,
    addUserMessage,
    addAssistantMessage,
    sendStreamMessage,
    sendNonStreamMessage,
    currentModelId,
  ]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 清空对话
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setUsage(undefined);
    setError(null);
  }, []);

  /**
   * 重新生成最后一条回复
   */
  const regenerate = useCallback(async (options?: SendMessageOptions) => {
    if (messages.length < 2) {
      throw new Error('没有可重新生成的消息');
    }

    // 找到最后一个用户消息
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      throw new Error('没有找到用户消息');
    }

    // 删除最后的助手消息
    removeLastMessage();
    
    // 重新发送
    await sendMessage(lastUserMessage.content as string, options);
  }, [messages, removeLastMessage, sendMessage]);

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    if (currentStreamRef.current) {
      currentStreamRef.current.abortController.abort();
      currentStreamRef.current = null;
      setIsLoading(false);
      console.log('[useChat] 已停止生成');
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    usage,
    sendMessage,
    clearError,
    clearMessages,
    regenerate,
    stopGeneration,
  };
}

/**
 * 简化的消息发送 Hook
 * 仅用于快速发送单条消息，不包含完整状态管理
 */
export function useSendMessage(modelId: string) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    options?: {
      stream?: boolean;
      chatOptions?: QwenChatOptions;
    }
  ) => {
    try {
      setIsSending(true);
      setError(null);

      const messages: ChatMessage[] = [
        { role: 'user', content }
      ];

      if (options?.stream) {
        // TODO: 实现简化的流式发送
        console.warn('简化的 Hook 暂不支持流式');
      }

      const result = await window.electron.ipcRenderer.invoke('model:chat', {
        messages,
        modelId,
        options: options?.chatOptions,
      });

      if (result.success && result.response) {
        return result.response.content;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发送失败';
      setError(errorMsg);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [modelId]);

  return {
    sendMessage,
    isSending,
    error,
  };
}
