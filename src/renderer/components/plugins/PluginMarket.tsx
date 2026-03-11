/**
 * 插件市场页面
 * 
 * 展示精选插件列表，支持分类筛选和搜索
 */

import React, { useState, useEffect } from 'react';
import { PluginCard } from './PluginCard';
import '../styles/plugins.css';

/**
 * 插件市场分类
 */
const CATEGORIES = [
  { id: 'all', name: '全部', icon: '🔍' },
  { id: 'featured', name: '精选', icon: '⭐' },
  { id: 'writing', name: '写作辅助', icon: '✍️' },
  { id: 'analysis', name: '数据分析', icon: '📊' },
  { id: 'productivity', name: '效率工具', icon: '⚡' },
];

/**
 * 插件市场 Props
 */
interface PluginMarketProps {
  /** 已安装的插件 ID 列表 */
  installedPlugins?: string[];
  /** 插件安装回调 */
  onInstall?: (pluginId: string) => void;
  /** 插件卸载回调 */
  onUninstall?: (pluginId: string) => void;
}

/**
 * 插件市场组件
 */
export const PluginMarket: React.FC<PluginMarketProps> = ({
  installedPlugins = [],
  onInstall,
  onUninstall,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 加载插件市场数据
  useEffect(() => {
    loadMarketPlugins();
  }, []);

  /**
   * 加载市场插件列表
   */
  async function loadMarketPlugins() {
    try {
      // TODO: 从服务器获取插件市场数据
      // MVP 阶段使用示例数据
      const mockPlugins = [
        {
          id: 'xiaohongshu-analyzer',
          name: '小红书笔记分析器',
          description: '分析小红书笔记内容，生成爆款拆解报告',
          version: '1.0.0',
          author: 'OpenCrab Team',
          icon: '📝',
          featured: true,
          category: 'analysis',
          downloads: 1234,
          rating: 4.8,
          installed: installedPlugins.includes('xiaohongshu-analyzer'),
        },
        {
          id: 'chinese-doc-writer',
          name: '中文公文写作助手',
          description: '基于模板生成符合中文规范的公文',
          version: '1.0.0',
          author: 'OpenCrab Team',
          icon: '📄',
          featured: true,
          category: 'writing',
          downloads: 987,
          rating: 4.9,
          installed: installedPlugins.includes('chinese-doc-writer'),
        },
      ];

      setPlugins(mockPlugins);
    } catch (error) {
      console.error('[PluginMarket] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 筛选插件
   */
  const filteredPlugins = plugins.filter(plugin => {
    // 分类筛选
    if (selectedCategory === 'featured' && !plugin.featured) {
      return false;
    }
    if (selectedCategory !== 'all' && selectedCategory !== 'featured') {
      if (plugin.category !== selectedCategory) {
        return false;
      }
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="plugin-market">
      {/* 头部 */}
      <div className="plugin-market-header">
        <h2>插件市场</h2>
        <p className="plugin-market-desc">
          发现和安装实用插件，扩展你的 OpenCrab
        </p>
      </div>

      {/* 分类和搜索栏 */}
      <div className="plugin-market-toolbar">
        <div className="plugin-categories">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="plugin-search">
          <input
            type="text"
            placeholder="搜索插件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 插件列表 */}
      <div className="plugin-list">
        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : filteredPlugins.length === 0 ? (
          <div className="empty-state">
            <p>暂无插件</p>
          </div>
        ) : (
          <div className="plugin-grid">
            {filteredPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                {...plugin}
                onInstall={() => onInstall?.(plugin.id)}
                onUninstall={() => onUninstall?.(plugin.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
