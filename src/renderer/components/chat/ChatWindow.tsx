/**
 * 聊天窗口组件
 * 
 * 主聊天容器，集成所有子组件
 */

import React, { useState, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import ModelSelector from './ModelSelector';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { QwenChatOptions } from '../../../../shared/types';

/**
 * 组件属性
 */
interface ChatWindowProps {
  /** 初始模型 ID */
  initialModelId?: string;
}

/**
 * 聊天窗口组件
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  initialModelId = 'qwen-max',
}) => {
  // 当前模型 ID
  const [currentModelId, setCurrentModelId] = useState(initialModelId);
  // 聊天参数
  const [chatOptions, setChatOptions] = useState<QwenChatOptions>({
    temperature: 1.0,
    top_p: 0.8,
    maxTokens: 2000,
  });

  // 使用聊天 Hook
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    regenerate,
    stopGeneration,
  } = useChat(currentModelId);

  // 使用认证 Hook（用于检查登录状态）
  const { isAuthenticated } = useAuth('aliyun');

  /**
   * 处理发送消息
   */
  const handleSend = useCallback(async (content: string) => {
    await sendMessage(content, {
      stream: true,
      chatOptions,
    });
  }, [sendMessage, chatOptions]);

  /**
   * 处理模型切换
   */
  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModelId(modelId);
  }, []);

  /**
   * 处理参数调整
   */
  const handleOptionsChange = useCallback((options: QwenChatOptions) => {
    setChatOptions(options);
  }, []);

  /**
   * 清空对话确认
   */
  const handleClear = useCallback(() => {
    if (window.confirm('确定要清空当前对话吗？')) {
      clearMessages();
    }
  }, [clearMessages]);

  /**
   * 重新生成
   */
  const handleRegenerate = useCallback(async () => {
    if (messages.length < 2) {
      alert('没有可重新生成的消息');
      return;
    }
    await regenerate({ chatOptions });
  }, [regenerate, chatOptions, messages.length]);

  /**
   * 停止生成
   */
  const handleStop = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  // 未登录提示
  if (!isAuthenticated) {
    return (
      <div className="chat-window chat-window--unauthenticated">
        <div className="chat-window__login-prompt">
          <h2>欢迎使用 OpenCrab</h2>
          <p>请先登录阿里云账号以使用 AI 对话功能</p>
          {/* TODO: 添加登录按钮 */}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* 顶部工具栏 */}
      <div className="chat-window__toolbar">
        <ModelSelector
          currentModelId={currentModelId}
          onModelChange={handleModelChange}
          chatOptions={chatOptions}
          onOptionsChange={handleOptionsChange}
        />
        
        <div className="chat-window__actions">
          <button
            onClick={handleRegenerate}
            disabled={isLoading || messages.length < 2}
            className="chat-window__action-btn"
            title="重新生成"
          >
            🔄
          </button>
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="chat-window__action-btn"
            title="清空对话"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="chat-window__error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('clear-error'))}>
            关闭
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />

      {/* 停止生成按钮（加载中时显示） */}
      {isLoading && (
        <div className="chat-window__stop">
          <button onClick={handleStop} className="chat-window__stop-btn">
            ⏹️ 停止生成
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="chat-window__input">
        <MessageInput
          isLoading={isLoading}
          onSend={handleSend}
          placeholder={isLoading ? 'AI 正在思考...' : '输入消息... (Ctrl+Enter 发送)'}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
