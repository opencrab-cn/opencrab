/**
 * 模型选择器组件
 * 
 * 功能：
 * - 显示可用模型列表
 * - 切换当前使用的模型
 * - 调节高级参数（temperature, top_p 等）
 */

import React, { useState, useEffect } from 'react';
import { QwenChatOptions } from '../../../shared/types';

/**
 * 模型信息接口
 */
interface ModelInfo {
  modelId: string;
  displayName: string;
  provider: string;
  capabilities: {
    supportsVision: boolean;
    supportsAudio: boolean;
    maxContextLength: number;
  };
}

/**
 * 组件属性
 */
interface ModelSelectorProps {
  /** 当前选中的模型 ID */
  currentModelId: string;
  /** 模型切换回调 */
  onModelChange: (modelId: string) => void;
  /** 当前参数配置 */
  chatOptions?: QwenChatOptions;
  /** 参数变化回调 */
  onOptionsChange?: (options: QwenChatOptions) => void;
}

/**
 * 模型选择器组件
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModelId,
  onModelChange,
  chatOptions = {},
  onOptionsChange,
}) => {
  // 可用的模型列表
  const [models, setModels] = useState<ModelInfo[]>([]);
  // 是否显示高级设置
  const [showAdvanced, setShowAdvanced] = useState(false);
  // 本地参数状态
  const [localOptions, setLocalOptions] = useState<QwenChatOptions>(chatOptions);

  /**
   * 加载可用模型列表
   */
  useEffect(() => {
    const loadModels = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('model:list');
        if (result.success && result.models) {
          setModels(result.models);
        }
      } catch (error) {
        console.error('[ModelSelector] 加载模型列表失败:', error);
      }
    };

    loadModels();
  }, []);

  /**
   * 同步外部参数变化
   */
  useEffect(() => {
    setLocalOptions(chatOptions);
  }, [chatOptions]);

  /**
   * 处理模型切换
   */
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    onModelChange(modelId);
  };

  /**
   * 处理参数变化
   */
  const handleOptionChange = (key: keyof QwenChatOptions, value: number | undefined) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    onOptionsChange?.(newOptions);
  };

  /**
   * 重置为默认值
   */
  const handleReset = () => {
    const defaultOptions: QwenChatOptions = {
      temperature: 1.0,
      top_p: 0.8,
      maxTokens: 2000,
    };
    setLocalOptions(defaultOptions);
    onOptionsChange?.(defaultOptions);
  };

  // 获取当前模型信息
  const currentModel = models.find(m => m.modelId === currentModelId);

  return (
    <div className="model-selector">
      {/* 模型选择下拉框 */}
      <div className="model-selector__main">
        <select
          value={currentModelId}
          onChange={handleModelChange}
          className="model-selector__dropdown"
          title="选择模型"
        >
          {models.map(model => (
            <option key={model.modelId} value={model.modelId}>
              {model.displayName}
              {model.capabilities.maxContextLength >= 32000 ? ' (长文本)' : ''}
              {model.capabilities.supportsVision ? ' (视觉)' : ''}
            </option>
          ))}
        </select>

        {/* 高级设置开关 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`model-selector__toggle ${showAdvanced ? 'active' : ''}`}
          title="高级参数设置"
        >
          ⚙️
        </button>
      </div>

      {/* 高级参数面板 */}
      {showAdvanced && (
        <div className="model-selector__advanced">
          <div className="model-selector__header">
            <span>生成参数</span>
            <button onClick={handleReset} className="model-selector__reset">
              重置
            </button>
          </div>

          {/* Temperature */}
          <div className="model-selector__param">
            <label>
              <span className="model-selector__label">
                Temperature (温度)
                <span className="model-selector__value">{localOptions.temperature ?? 1.0}</span>
              </span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={localOptions.temperature ?? 1.0}
                onChange={(e) => handleOptionChange('temperature', parseFloat(e.target.value))}
                className="model-selector__slider"
              />
            </label>
            <p className="model-selector__hint">
              控制随机性：较低值更确定，较高值更有创造性
            </p>
          </div>

          {/* Top-p */}
          <div className="model-selector__param">
            <label>
              <span className="model-selector__label">
                Top-p
                <span className="model-selector__value">{localOptions.top_p ?? 0.8}</span>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localOptions.top_p ?? 0.8}
                onChange={(e) => handleOptionChange('top_p', parseFloat(e.target.value))}
                className="model-selector__slider"
              />
            </label>
            <p className="model-selector__hint">
              核采样：只考虑累积概率前 p% 的词
            </p>
          </div>

          {/* Max Tokens */}
          <div className="model-selector__param">
            <label>
              <span className="model-selector__label">
                最大长度
                <span className="model-selector__value">{localOptions.maxTokens ?? 2000}</span>
              </span>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={localOptions.maxTokens ?? 2000}
                onChange={(e) => handleOptionChange('maxTokens', parseInt(e.target.value))}
                className="model-selector__slider"
              />
            </label>
            <p className="model-selector__hint">
              单次响应的最大 token 数量
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
