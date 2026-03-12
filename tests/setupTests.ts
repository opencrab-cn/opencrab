/**
 * Jest 测试配置文件
 * 
 * 设置全局的测试环境、mocks 和工具函数
 */

import '@testing-library/jest-dom';

// Mock Electron API
// @ts-ignore - 测试环境中添加的扩展
(global as any).window.electron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    once: jest.fn(),
  },
  platform: {
    platform: 'darwin',
    arch: 'x64',
    nodeVersion: 'v20.0.0',
    electronVersion: '28.3.3',
    chromeVersion: '120.0.0',
  },
  app: {
    appPath: '/test/path',
    isDev: true,
  },
};

// Mock IPC 调用的默认实现
beforeEach(() => {
  jest.clearAllMocks();
  
  // 设置默认的 IPC 调用模拟
  window.electron.ipcRenderer.invoke.mockImplementation(async (channel: string, ...args: unknown[]) => {
    console.log(`[Mock IPC] invoke: ${channel}`, args);
    
    // 模拟模型列表返回
    if (channel === 'model:list') {
      return {
        success: true,
        models: [
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
        ],
      };
    }
    
    // 模拟认证状态
    if (channel === 'auth:getStatus') {
      return {
        success: true,
        status: {
          isAuthenticated: false,
          token: null,
          needsRefresh: false,
        },
      };
    }
    
    // 默认返回
    return { success: true };
  });
});

// 全局测试超时设置
jest.setTimeout(10000);

// 清理函数
afterEach(() => {
  jest.restoreAllMocks();
});
