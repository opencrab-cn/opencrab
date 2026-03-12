/**
 * 渲染进程入口文件
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/chat.scss';

// 添加全局样式，确保应用占满整个窗口
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  
  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;
document.head.appendChild(globalStyles);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
