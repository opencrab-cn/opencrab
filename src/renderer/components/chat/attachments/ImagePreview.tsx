/**
 * 图片预览组件
 * 
 * 显示缩略图、删除按钮、加载状态
 */

import React from 'react';
import { ImageAttachment } from '../../../../shared/types/attachments';

/**
 * 组件属性
 */
interface ImagePreviewProps {
  /** 图片附件 */
  attachment: ImageAttachment;
  /** 删除回调 */
  onRemove: (id: string) => void;
  /** 禁用删除 */
  disabled?: boolean;
}

/**
 * 图片预览组件
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({
  attachment,
  onRemove,
  disabled = false,
}) => {
  const { data, processedData, status, error, metadata } = attachment;

  /**
   * 处理删除
   */
  const handleRemove = () => {
    if (!disabled) {
      onRemove(attachment.id);
    }
  };

  /**
   * 渲染加载状态
   */
  const renderStatus = () => {
    if (status === 'processing') {
      return (
        <div className="image-preview__overlay">
          <span className="image-preview__spinner">⏳</span>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="image-preview__overlay">
          <span className="image-preview__error">❌</span>
          <span className="image-preview__error-text">{error}</span>
        </div>
      );
    }

    return null;
  };

  /**
   * 渲染尺寸信息
   */
  const renderSizeInfo = () => {
    if (!metadata?.width || !metadata?.height) return null;

    return (
      <div className="image-preview__info">
        {metadata.width} × {metadata.height}
      </div>
    );
  };

  return (
    <div className="image-preview">
      {/* 缩略图容器 */}
      <div className="image-preview__container">
        <img
          src={processedData || data}
          alt={attachment.filename}
          className="image-preview__image"
        />
        
        {/* 状态覆盖层 */}
        {renderStatus()}

        {/* 删除按钮 */}
        {!disabled && status !== 'processing' && (
          <button
            onClick={handleRemove}
            className="image-preview__remove"
            title="删除图片"
          >
            ×
          </button>
        )}

        {/* 尺寸信息 */}
        {renderSizeInfo()}
      </div>

      {/* 文件名 */}
      <div className="image-preview__filename">
        {attachment.filename}
      </div>
    </div>
  );
};

export default ImagePreview;
