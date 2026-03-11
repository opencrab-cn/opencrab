/**
 * 插件清单类型定义
 * 
 * 定义插件的元数据、权限和配置接口
 */

/**
 * 插件权限枚举
 */
export type PluginPermission = 
  | 'model:chat'           // 调用模型对话
  | 'model:stream'         // 调用流式对话
  | 'fs:read'              // 读取文件
  | 'fs:write'             // 写入文件
  | 'notification'         // 发送系统通知
  | 'clipboard'            // 访问剪贴板
  | 'network:request'      // 网络请求
  | 'storage'              // 本地存储
  | 'ui:dialog'            // 显示对话框;

/**
 * 插件运行环境
 */
export type PluginEnvironment = 'renderer' | 'main' | 'both';

/**
 * 插件清单接口
 */
export interface PluginManifest {
  /** 插件唯一标识符 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件描述 */
  description: string;
  /** 版本号 (semver) */
  version: string;
  /** 作者信息 */
  author: string;
  /** 插件图标 (emoji 或 URL) */
  icon?: string;
  /** 插件封面图 (URL) */
  cover?: string;
  /** 运行环境 */
  environment: PluginEnvironment;
  /** 所需权限列表 */
  permissions: PluginPermission[];
  /** 插件入口文件路径 */
  main: string;
  /** 渲染进程入口（如果有 UI） */
  renderer?: string;
  /** 默认配置 */
  defaultConfig?: Record<string, any>;
  /** 插件标签（用于分类） */
  tags?: string[];
  /** 是否为官方精选 */
  featured?: boolean;
  /** 插件主页 */
  homepage?: string;
  /** 仓库地址 */
  repository?: string;
}

/**
 * 插件加载状态
 */
export enum PluginStatus {
  /** 未加载 */
  UNLOADED = 'unloaded',
  /** 加载中 */
  LOADING = 'loading',
  /** 已启用 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 加载失败 */
  ERROR = 'error',
}

/**
 * 插件实例接口
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest;
  /** 当前状态 */
  status: PluginStatus;
  /** 沙箱环境引用 */
  sandbox?: any;
  /** 错误信息 */
  error?: string;
  /** 加载时间 */
  loadedAt?: number;
  /** 最后激活时间 */
  lastActivatedAt?: number;
}

/**
 * 插件配置项
 */
export interface PluginConfigItem {
  /** 配置键名 */
  key: string;
  /** 配置标题 */
  title: string;
  /** 配置描述 */
  description?: string;
  /** 配置类型 */
  type: 'string' | 'number' | 'boolean' | 'select' | 'text';
  /** 默认值 */
  defaultValue: any;
  /** 可选项（select 类型使用） */
  options?: Array<{ label: string; value: any }>;
  /** 验证规则 */
  validator?: (value: any) => boolean;
  /** 错误提示 */
  errorMessage?: string;
}

/**
 * 插件配置页面 props
 */
export interface PluginSettingsProps {
  /** 插件 ID */
  pluginId: string;
  /** 当前配置 */
  config: Record<string, any>;
  /** 配置变更回调 */
  onConfigChange: (key: string, value: any) => void;
  /** 保存配置回调 */
  onSave: () => void;
}

/**
 * 插件市场分类
 */
export type PluginCategory = 
  | 'all'              // 全部
  | 'featured'         // 精选
  | 'writing'          // 写作辅助
  | 'analysis'         // 数据分析
  | 'productivity'     // 效率工具
  | 'entertainment'    // 娱乐
  | 'education'        // 教育
  | 'custom';         // 自定义

/**
 * 插件市场项
 */
export interface PluginMarketItem extends PluginManifest {
  /** 下载量 */
  downloads?: number;
  /** 评分 */
  rating?: number;
  /** 评论数 */
  reviews?: number;
  /** 是否已安装 */
  installed: boolean;
  /** 是否已启用 */
  enabled: boolean;
  /** 分类标签 */
  category: PluginCategory;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 插件 API 调用结果
 */
export interface PluginAPIResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}
