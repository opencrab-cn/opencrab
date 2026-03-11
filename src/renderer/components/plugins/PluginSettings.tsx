/**
 * 插件设置页面
 * 
 * 配置已安装插件的参数
 */

import React, { useState, useEffect } from 'react';

/**
 * 插件设置项
 */
interface SettingItem {
  key: string;
  title: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text';
  value: any;
  options?: Array<{ label: string; value: any }>;
}

/**
 * 插件设置 Props
 */
interface PluginSettingsProps {
  /** 插件 ID */
  pluginId: string;
  /** 插件名称 */
  pluginName: string;
  /** 当前配置 */
  config: Record<string, any>;
  /** 配置变更回调 */
  onConfigChange: (key: string, value: any) => void;
  /** 保存配置回调 */
  onSave: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

/**
 * 插件设置组件
 */
export const PluginSettings: React.FC<PluginSettingsProps> = ({
  pluginId,
  pluginName,
  config,
  onConfigChange,
  onSave,
  onCancel,
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化配置
  useEffect(() => {
    setLocalConfig({ ...config });
  }, [config]);

  /**
   * 处理配置变更
   */
  const handleSettingChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    onConfigChange(key, value);
    setHasChanges(true);
  };

  /**
   * 处理保存
   */
  const handleSave = () => {
    onSave();
    setHasChanges(false);
  };

  return (
    <div className="plugin-settings">
      {/* 头部 */}
      <div className="plugin-settings-header">
        <h2>{pluginName} - 设置</h2>
        <p className="plugin-id">ID: {pluginId}</p>
      </div>

      {/* 配置表单 */}
      <div className="plugin-settings-form">
        {Object.entries(localConfig).map(([key, value]) => (
          <div key={key} className="setting-item">
            <div className="setting-label">
              <span className="setting-title">{formatKey(key)}</span>
              {value !== undefined && (
                <span className="setting-value">{String(value)}</span>
              )}
            </div>
            
            {renderSettingInput(key, value, handleSettingChange)}
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="plugin-settings-actions">
        <button 
          className="btn btn-secondary"
          onClick={onCancel}
        >
          取消
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          保存更改
        </button>
      </div>
    </div>
  );
};

/**
 * 渲染配置输入控件
 */
function renderSettingInput(
  key: string,
  value: any,
  onChange: (key: string, value: any) => void
) {
  // 根据值类型判断输入控件类型
  if (typeof value === 'boolean') {
    return (
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(key, e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(key, Number(e.target.value))}
        className="setting-input"
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(key, e.target.value)}
        className="setting-input"
      />
    );
  }

  return null;
}

/**
 * 格式化配置键名
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}
