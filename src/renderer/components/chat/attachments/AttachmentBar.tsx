/**
 * 附件管理栏组件
 * 
 * 显示已选择的文件列表
 * 支持图片预览、音频录制、文件选择
 */

import React, { useRef } from 'react';
import { AnyAttachment, ImageAttachment, AudioAttachment } from '../../../../shared/types/attachments';
import ImagePreview from './ImagePreview';
import AudioRecorder from './AudioRecorder';

/**
 * 组件属性
 */
interface AttachmentBarProps {
  /** 附件列表 */
  attachments: AnyAttachment[];
  /** 删除附件回调 */
  onRemove: (id: string) => void;
  /** 录音完成回调 */
  onRecordingComplete: (blob: Blob) => void;
  /** 文件选择变化回调 */
  onFilesChange: (files: FileList) => void;
  /** 禁用状态 */
  disabled?: boolean;
}

/**
 * 附件管理栏组件
 */
export const AttachmentBar: React.FC<AttachmentBarProps> = ({
  attachments,
  onRemove,
  onRecordingComplete,
  onFilesChange,
  disabled = false,
}) => {
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 是否显示录音器
  const [showRecorder, setShowRecorder] = React.useState(false);

  /**
   * 处理图片选择
   */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesChange(e.target.files);
      // 清空 input 以允许重复选择同一文件
      e.target.value = '';
    }
  };

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  /**
   * 切换录音器显示
   */
  const toggleRecorder = () => {
    setShowRecorder(!showRecorder);
  };

  /**
   * 渲染图片附件
   */
  const renderImageAttachment = (attachment: AnyAttachment) => {
    if (attachment.type !== 'image') return null;
    
    return (
      <ImagePreview
        key={attachment.id}
        attachment={attachment as ImageAttachment}
        onRemove={onRemove}
        disabled={disabled}
      />
    );
  };

  /**
   * 渲染音频附件
   */
  const renderAudioAttachment = (attachment: AnyAttachment) => {
    if (attachment.type !== 'audio') return null;
    
    const audio = attachment as AudioAttachment;
    
    return (
      <div key={attachment.id} className="attachment-bar__audio">
        <audio
          controls
          src={audio.processedData || audio.data}
          className="attachment-bar__audio-player"
        />
        <div className="attachment-bar__audio-info">
          <span className="attachment-bar__filename">{audio.filename}</span>
          {audio.metadata?.duration && (
            <span className="attachment-bar__duration">
              {Math.floor(audio.metadata.duration)}s
            </span>
          )}
        </div>
        {!disabled && (
          <button
            onClick={() => onRemove(attachment.id)}
            className="attachment-bar__remove"
            title="删除音频"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="attachment-bar">
      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="attachment-bar__list">
          {attachments.map(renderImageAttachment)}
          {attachments.map(renderAudioAttachment)}
        </div>
      )}

      {/* 工具栏 */}
      <div className="attachment-bar__toolbar">
        {/* 隐藏的文件输入框（图片） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {/* 添加图片按钮 */}
        <button
          onClick={triggerFileSelect}
          className="attachment-bar__button"
          title="添加图片"
          disabled={disabled}
        >
          🖼️ 图片
        </button>

        {/* 录音按钮 */}
        <button
          onClick={toggleRecorder}
          className={`attachment-bar__button ${showRecorder ? 'active' : ''}`}
          title="录音"
          disabled={disabled}
        >
          🎤 录音
        </button>

        {/* 文件选择按钮（预留） */}
        <button
          className="attachment-bar__button attachment-bar__button--disabled"
          title="文件（开发中）"
          disabled
        >
          📄 文件
        </button>
      </div>

      {/* 录音器 */}
      {showRecorder && (
        <div className="attachment-bar__recorder">
          <AudioRecorder
            onRecordingComplete={onRecordingComplete}
            onCancel={() => setShowRecorder(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AttachmentBar;
