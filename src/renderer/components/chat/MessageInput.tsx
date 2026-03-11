/**
 * 消息输入组件
 * 
 * 功能：
 * - 多行文本输入
 * - Ctrl+Enter 发送，Enter 换行
 * - 附件预览（图片/音频预留）
 * - 发送按钮
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * 组件属性
 */
interface MessageInputProps {
  /** 是否正在加载（发送中） */
  isLoading: boolean;
  /** 发送消息回调 */
  onSend: (content: string) => Promise<void>;
  /** 禁用发送 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
}

/**
 * 消息输入组件
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  isLoading,
  onSend,
  disabled = false,
  placeholder = '输入消息... (Ctrl+Enter 发送)',
}) => {
  // 输入内容
  const [input, setInput] = useState('');
  // 是否聚焦
  const [isFocused, setIsFocused] = useState(false);
  // 附件预览（预留）
  const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'audio'; data: string }>>([]);
  // 文本域引用
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 自动调整文本域高度
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  /**
   * 处理发送
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading || disabled) return;

    try {
      await onSend(input);
      setInput('');
      
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('[MessageInput] 发送失败:', error);
      // 错误由上层处理，这里保留输入内容
    }
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter / Cmd+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Enter 单独按下不阻止默认行为（允许换行）
  };

  /**
   * 处理粘贴（预留图片处理）
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 处理图片
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setAttachments(prev => [...prev, {
                type: 'image',
                data: event.target!.result as string,
              }]);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  /**
   * 移除附件
   */
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="message-input">
      {/* 附件预览区 */}
      {attachments.length > 0 && (
        <div className="message-input__attachments">
          {attachments.map((attachment, index) => (
            <div key={index} className="message-input__attachment">
              {attachment.type === 'image' && (
                <img src={attachment.data} alt="预览" className="message-input__preview" />
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="message-input__remove"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className={`message-input__container ${isFocused ? 'focused' : ''}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className="message-input__textarea"
        />

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className="message-input__send"
          title="发送 (Ctrl+Enter)"
        >
          {isLoading ? (
            <span className="message-input__loading">⏳</span>
          ) : (
            <span>📤</span>
          )}
        </button>
      </div>

      {/* 提示信息 */}
      <div className="message-input__footer">
        <span>按 Enter 换行，Ctrl+Enter 发送</span>
        {/* 多模态功能入口（预留） */}
        <div className="message-input__actions">
          <button
            className="message-input__action"
            title="上传图片（开发中）"
            disabled
          >
            🖼️
          </button>
          <button
            className="message-input__action"
            title="语音输入（开发中）"
            disabled
          >
            🎤
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
