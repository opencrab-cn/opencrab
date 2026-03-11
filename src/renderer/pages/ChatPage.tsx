/**
 * 聊天页面组件
 * 
 * 集成认证、侧边栏会话列表、主聊天区
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import ChatWindow from '../components/chat/ChatWindow';

/**
 * 会话信息（预留）
 */
interface Conversation {
  id: string;
  title: string;
  lastMessageAt: number;
  messageCount: number;
}

/**
 * 聊天页面组件
 */
const ChatPage: React.FC = () => {
  // 认证状态
  const { isAuthenticated, isLoading: authLoading, login, logout } = useAuth('aliyun');
  
  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 会话列表（预留）
  const [conversations, setConversations] = useState<Conversation[]>([]);

  /**
   * 监听登录状态变化
   */
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // 可选：自动弹出登录提示
      console.log('[ChatPage] 未登录，等待用户操作');
    }
  }, [isAuthenticated, authLoading]);

  /**
   * 处理登录
   */
  const handleLogin = async () => {
    try {
      await login('aliyun');
    } catch (error) {
      console.error('[ChatPage] 登录失败:', error);
      alert('登录失败，请重试');
    }
  };

  /**
   * 处理登出
   */
  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      try {
        await logout('aliyun');
      } catch (error) {
        console.error('[ChatPage] 登出失败:', error);
      }
    }
  };

  /**
   * 新建对话（预留）
   */
  const handleNewConversation = () => {
    // TODO: 实现新建对话逻辑
    console.log('[ChatPage] 新建对话');
  };

  // 加载中的状态
  if (authLoading) {
    return (
      <div className="chat-page chat-page--loading">
        <div className="chat-page__spinner">
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="chat-page chat-page--login">
        <div className="chat-page__login-card">
          <h1>🦀 OpenCrab</h1>
          <p className="chat-page__subtitle">AI Agent 桌面框架</p>
          
          <div className="chat-page__features">
            <div className="feature">
              <span className="feature__icon">🔐</span>
              <h3>OAuth 免费认证</h3>
              <p>无需 API Key，一键登录</p>
            </div>
            <div className="feature">
              <span className="feature__icon">💬</span>
              <h3>多模型支持</h3>
              <p>通义千问等中文大模型</p>
            </div>
            <div className="feature">
              <span className="feature__icon">🎨</span>
              <h3>全模态交互</h3>
              <p>文本/图像/音频输入</p>
            </div>
          </div>

          <button onClick={handleLogin} className="chat-page__login-btn">
            使用阿里云账号登录
          </button>
          
          <p className="chat-page__hint">
            登录即表示你同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    );
  }

  // 已登录状态 - 完整聊天界面
  return (
    <div className="chat-page">
      {/* 侧边栏（会话列表） */}
      <aside className={`chat-page__sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar__header">
          <h2>🦀 OpenCrab</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="sidebar__toggle sidebar__toggle--close"
            title="收起侧边栏"
          >
            ◀
          </button>
        </div>

        {/* 新建对话按钮 */}
        <button onClick={handleNewConversation} className="sidebar__new-chat">
          ➕ 新建对话
        </button>

        {/* 会话列表（预留） */}
        <div className="sidebar__conversations">
          {conversations.length === 0 ? (
            <p className="sidebar__empty">暂无会话</p>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} className="conversation-item">
                <span className="conversation-item__title">{conv.title}</span>
                <span className="conversation-item__time">
                  {new Date(conv.lastMessageAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* 底部用户信息 */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span>👤</span>
            <span>阿里云用户</span>
          </div>
          <button onClick={handleLogout} className="sidebar__logout">
            退出登录
          </button>
        </div>
      </aside>

      {/* 主聊天区 */}
      <main className="chat-page__main">
        {/* 展开侧边栏按钮 */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="chat-page__sidebar-toggle"
            title="展开侧边栏"
          >
            ▶
          </button>
        )}

        {/* 聊天窗口 */}
        <ChatWindow initialModelId="qwen-max" />
      </main>
    </div>
  );
};

export default ChatPage;
