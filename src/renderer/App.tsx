/**
 * 路由配置示例
 * 
 * 展示如何集成聊天页面到应用中
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 首页重定向到聊天页 */}
        <Route path="/" element={<Navigate to="/chat" replace />} />
        
        {/* 聊天页面 */}
        <Route path="/chat" element={<ChatPage />} />
        
        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
