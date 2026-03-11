/**
 * 插件卡片组件
 * 
 * 展示单个插件的信息和操作按钮
 */

import React, { useState } from 'react';

/**
 * 插件卡片 Props
 */
interface PluginCardProps {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件描述 */
  description: string;
  /** 版本号 */
  version: string;
  /** 作者 */
  author: string;
  /** 图标（emoji） */
  icon?: string;
  /** 是否精选 */
  featured?: boolean;
  /** 下载量 */
  downloads?: number;
  /** 评分 */
  rating?: number;
  /** 是否已安装 */
  installed: boolean;
  /** 是否已启用 */
  enabled?: boolean;
  /** 安装回调 */
  onInstall?: () => void;
  /** 卸载回调 */
  onUninstall?: () => void;
}

/**
 * 插件卡片组件
 */
export const PluginCard: React.FC<PluginCardProps> = ({
  id,
  name,
  description,
  version,
  author,
  icon,
  featured,
  downloads,
  rating,
  installed,
  enabled,
  onInstall,
  onUninstall,
}) => {
  const [isOperating, setIsOperating] = useState(false);

  /**
   * 处理安装/卸载
   */
  const handleAction = async () => {
    setIsOperating(true);
    
    try {
      if (installed) {
        await onUninstall?.();
      } else {
        await onInstall?.();
      }
    } catch (error) {
      console.error(`[PluginCard] 操作失败:`, error);
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className={`plugin-card ${featured ? 'featured' : ''}`}>
      {/* 精选标记 */}
      {featured && (
        <div className="featured-badge">
          <span>⭐ 精选</span>
        </div>
      )}

      {/* 卡片头部 */}
      <div className="plugin-card-header">
        <div className="plugin-icon">
          {icon || '🧩'}
        </div>
        <div className="plugin-info">
          <h3 className="plugin-name">{name}</h3>
          <p className="plugin-version">v{version}</p>
        </div>
      </div>

      {/* 插件描述 */}
      <p className="plugin-description">{description}</p>

      {/* 作者信息 */}
      <div className="plugin-meta">
        <span className="plugin-author">by {author}</span>
        {downloads !== undefined && (
          <span className="plugin-stats">
            📥 {downloads.toLocaleString()}
          </span>
        )}
        {rating !== undefined && (
          <span className="plugin-stats">
            ⭐ {rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="plugin-actions">
        {installed ? (
          enabled ? (
            <button 
              className="btn btn-secondary"
              onClick={handleAction}
              disabled={isOperating}
            >
              {isOperating ? '操作中...' : '已启用'}
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={handleAction}
              disabled={isOperating}
            >
              {isOperating ? '操作中...' : '启用'}
            </button>
          )
        ) : (
          <button 
            className="btn btn-primary"
            onClick={handleAction}
            disabled={isOperating}
          >
            {isOperating ? '安装中...' : '安装'}
          </button>
        )}
        
        {installed && (
          <button className="btn btn-ghost">
            设置
          </button>
        )}
      </div>
    </div>
  );
};
