/**
 * 媒体处理工具
 * 
 * 图片压缩、音频转码、文件解析
 * 在主进程执行，避免阻塞 UI
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  Attachment, 
  ImageAttachment, 
  AudioAttachment,
  MediaProcessingOptions,
  DEFAULT_MEDIA_OPTIONS,
  FILE_SIZE_LIMITS,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
} from '../../shared/types/attachments';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证文件大小
 */
function validateFileSize(file: File, type: 'image' | 'audio' | 'file'): boolean {
  const limit = FILE_SIZE_LIMITS[type];
  return file.size <= limit;
}

/**
 * 验证文件类型
 */
function validateFileType(file: File, type: 'image' | 'audio' | 'file'): boolean {
  if (type === 'image') {
    return SUPPORTED_IMAGE_FORMATS.includes(file.type);
  } else if (type === 'audio') {
    return SUPPORTED_AUDIO_FORMATS.includes(file.type);
  }
  return true;
}

/**
 * 读取文件为 Base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 获取图片元数据
 */
async function getImageMetadata(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 获取音频元数据（需要 Web Audio API）
 */
async function getAudioMetadata(dataUrl: string): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve({
        duration: audio.duration,
      });
    };
    audio.onerror = reject;
    audio.src = dataUrl;
  });
}

/**
 * 创建附件对象
 */
export async function createAttachment(
  file: File,
  type: 'image' | 'audio' | 'file'
): Promise<Attachment> {
  // 验证文件
  if (!validateFileType(file, type)) {
    throw new Error(`不支持的文件类型：${file.type}`);
  }

  if (!validateFileSize(file, type)) {
    throw new Error(`文件大小超过限制（${FILE_SIZE_LIMITS[type] / 1024 / 1024}MB）`);
  }

  // 读取数据
  const data = await fileToBase64(file);
  
  // 创建基础附件
  const attachment: Attachment = {
    id: generateId(),
    type,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    data,
    status: 'pending',
  };

  // 获取元数据
  try {
    if (type === 'image') {
      const metadata = await getImageMetadata(data);
      attachment.metadata = metadata;
    } else if (type === 'audio') {
      const metadata = await getAudioMetadata(data);
      attachment.metadata = metadata;
    }
  } catch (error) {
    console.warn('[MediaProcessor] 获取元数据失败:', error);
  }

  return attachment;
}

/**
 * 图片压缩（使用 Canvas API）
 * TODO: 迁移到主进程使用 sharp
 */
export async function compressImage(
  dataUrl: string,
  options: MediaProcessingOptions = DEFAULT_MEDIA_OPTIONS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // 计算缩放比例
      const maxSize = options.maxImageSize || 1024;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 压缩图片
      const quality = (options.imageQuality || 80) / 100;
      const compressed = canvas.toDataURL('image/jpeg', quality);
      
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 音频转码（预留接口）
 * TODO: 在主进程使用 fluent-ffmpeg 实现
 */
export async function transcodeAudio(
  dataUrl: string,
  options: MediaProcessingOptions = DEFAULT_MEDIA_OPTIONS
): Promise<string> {
  // MVP 阶段直接返回原数据
  // 后续在主进程中实现 ffmpeg 转码
  console.log('[MediaProcessor] 音频转码功能待实现');
  return dataUrl;
}

/**
 * 处理附件（压缩/转码）
 */
export async function processAttachment(
  attachment: Attachment,
  options: MediaProcessingOptions = DEFAULT_MEDIA_OPTIONS
): Promise<Attachment> {
  attachment.status = 'processing';

  try {
    if (attachment.type === 'image' && options.compressImage) {
      const processed = await compressImage(attachment.data, options);
      attachment.processedData = processed;
      
      // 更新元数据
      const metadata = await getImageMetadata(processed);
      attachment.metadata = { ...attachment.metadata, ...metadata };
      attachment.size = Math.ceil((processed.length * 3) / 4); // Base64 长度估算
    } 
    else if (attachment.type === 'audio' && options.transcodeAudio) {
      const processed = await transcodeAudio(attachment.data, options);
      attachment.processedData = processed;
    }

    attachment.status = 'completed';
  } catch (error) {
    attachment.status = 'error';
    attachment.error = error instanceof Error ? error.message : '处理失败';
    console.error('[MediaProcessor] 处理附件失败:', error);
  }

  return attachment;
}

/**
 * 批量处理附件
 */
export async function processAttachments(
  attachments: Attachment[],
  options: MediaProcessingOptions = DEFAULT_MEDIA_OPTIONS
): Promise<Attachment[]> {
  return Promise.all(
    attachments.map(attachment => processAttachment(attachment, options))
  );
}

/**
 * 将附件转换为 Qwen-VL 格式
 */
export function convertToQwenFormat(attachment: Attachment): { type: string; [key: string]: any } {
  switch (attachment.type) {
    case 'image':
      return {
        type: 'image',
        image: attachment.processedData || attachment.data,
      };
    
    case 'audio':
      return {
        type: 'audio',
        audio: attachment.processedData || attachment.data,
      };
    
    default:
      throw new Error(`不支持的附件类型：${attachment.type}`);
  }
}

/**
 * 构建多模态消息
 */
export function buildMultimodalMessage(
  text: string,
  attachments: Attachment[]
): { role: 'user'; content: Array<{ type: string; [key: string]: any }> } {
  const content: Array<{ type: string; [key: string]: any }> = [];

  // 添加文本内容
  if (text.trim()) {
    content.push({
      type: 'text',
      text: text.trim(),
    });
  }

  // 添加附件内容
  for (const attachment of attachments) {
    const qwenFormat = convertToQwenFormat(attachment);
    content.push(qwenFormat);
  }

  return {
    role: 'user',
    content,
  };
}

/**
 * 清理附件数据（释放内存）
 */
export function cleanupAttachment(attachment: Attachment): void {
  // 可以在这里清理临时文件或释放内存
  console.log('[MediaProcessor] 清理附件:', attachment.id);
}

/**
 * 批量清理
 */
export function cleanupAttachments(attachments: Attachment[]): void {
  attachments.forEach(cleanupAttachment);
}
