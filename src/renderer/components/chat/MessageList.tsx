/**
 * 消息列表组件
 * 
 * 功能：
 * - 显示对话历史
 * - 支持流式更新动画
 * - Markdown 渲染 + 代码高亮
 * - 区分用户/助手消息
 */

import React, { useEffect, useRef } from 'react';
import { ChatMessageItem } from '../../../../shared/types';
import { createStreamRenderer, StreamRenderer } from '../../utils/streamRenderer';

/**
 * 组件属性
 */
interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessageItem[];
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 消息列表组件
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
}) => {
  // 消息容器引用（用于自动滚动）
  const containerRef = useRef<HTMLDivElement>(null);
  // 流式渲染器缓存
  const renderersRef = useRef<Map<string, StreamRenderer>>(new Map());
  // 最后一条消息 ID（用于检测新消息）
  const lastMessageIdRef = useRef<string | null>(null);

  /**
   * 自动滚动到底部
   */
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  /**
   * 监听消息变化，自动滚动
   */
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // 如果是新消息或正在加载，滚动到底部
      if (lastMessage.id !== lastMessageIdRef.current || isLoading) {
        scrollToBottom();
        lastMessageIdRef.current = lastMessage.id;
      }
    }
  }, [messages, isLoading]);

  /**
   * 清理渲染器缓存
   */
  useEffect(() => {
    return () => {
      renderersRef.current.forEach(renderer => renderer.clear());
      renderersRef.current.clear();
    };
  }, []);

  /**
   * 获取或创建流式渲染器
   */
  const getRenderer = (messageId: string): StreamRenderer => {
    let renderer = renderersRef.current.get(messageId);
    
    if (!renderer) {
      renderer = createStreamRenderer();
      renderersRef.current.set(messageId, renderer);
    }
    
    return renderer;
  };

  /**
   * 渲染消息内容
   */
  const renderContent = (message: ChatMessageItem): JSX.Element => {
    // 错误消息
    if (message.error) {
      return (
        <div className="message__error">
          <span>❌</span>
          <span>{message.error}</span>
        </div>
      );
    }

    // 空内容
    if (!message.content && !message.isLoading) {
      return <span className="message__empty">...</span>;
    }

    // 加载中状态
    if (message.isLoading) {
      return (
        <div className="message__loading">
          <span className="message__loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span>思考中</span>
        </div>
      );
    }

    // 用户消息（纯文本）
    if (message.role === 'user') {
      return (
        <div className="message__text">
          {message.content as string}
        </div>
      );
    }

    // 助手消息（Markdown 渲染）
    const renderer = getRenderer(message.id);
    const html = renderer.getContent() || renderMarkdown(message.content as string);
    
    return (
      <div
        className="message__markdown markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  /**
   * 降级 Markdown 渲染（简单处理）
   */
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    // 简单转义
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 保留换行
    return escaped.replace(/\n/g, '<br>');
  };

  /**
   * 格式化时间戳
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 今天
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 昨天
    if (diff < 48 * 60 * 60 * 1000) {
      return '昨天';
    }
    
    // 更早
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={containerRef} className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message message--${message.role} ${message.isLoading ? 'loading' : ''}`}
        >
          {/* 头像 */}
          <div className="message__avatar">
            {message.role === 'user' ? (
              <span className="message__avatar-user">👤</span>
            ) : (
              <span className="message__avatar-assistant">🤖</span>
            )}
          </div>

          {/* 消息气泡 */}
          <div className="message__bubble">
            {/* 消息头（时间和角色） */}
            <div className="message__header">
              <span className="message__role">
                {message.role === 'user' ? '你' : 'AI 助手'}
              </span>
              <span className="message__time">
                {formatTime(message.timestamp)}
              </span>
            </div>

            {/* 消息内容 */}
            <div className="message__content">
              {renderContent(message)}
            </div>
          </div>
        </div>
      ))}

      {/* 加载更多提示（预留） */}
      {isLoading && messages.length === 0 && (
        <div className="message-list__initial-loading">
          <span>正在连接 AI...</span>
        </div>
      )}
    </div>
  );
};

export default MessageList;
