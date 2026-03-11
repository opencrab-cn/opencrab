/**
 * 附件类型定义
 * 
 * 支持图片、音频等多种媒体类型
 * 预留文件解析接口
 */

/**
 * 附件类型枚举
 */
export type AttachmentType = 'image' | 'audio' | 'file';

/**
 * 附件基础接口
 */
export interface Attachment {
  /** 唯一标识 */
  id: string;
  /** 附件类型 */
  type: AttachmentType;
  /** 原始文件名 */
  filename: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小（字节） */
  size: number;
  /** Base64 编码数据或 URL */
  data: string;
  /** 压缩/转码后的数据（可选） */
  processedData?: string;
  /** 处理状态 */
  status: 'pending' | 'processing' | 'completed' | 'error';
  /** 错误信息 */
  error?: string;
  /** 额外元数据 */
  metadata?: {
    width?: number;      // 图片宽度
    height?: number;     // 图片高度
    duration?: number;   // 音频时长（秒）
    format?: string;     // 文件格式
  };
}

/**
 * 图片附件特有属性
 */
export interface ImageAttachment extends Attachment {
  type: 'image';
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

/**
 * 音频附件特有属性
 */
export interface AudioAttachment extends Attachment {
  type: 'audio';
  metadata?: {
    duration?: number;
    format?: string;
    sampleRate?: number;
  };
}

/**
 * 文件附件特有属性（预留）
 */
export interface FileAttachment extends Attachment {
  type: 'file';
  metadata?: {
    format?: string;
    pageCount?: number;  // PDF 页数等
  };
}

/**
 * 联合类型
 */
export type AnyAttachment = ImageAttachment | AudioAttachment | FileAttachment;

/**
 * 消息中的内容项（多模态）
 */
export interface ContentItem {
  type: 'text' | 'image' | 'audio';
  text?: string;
  image?: string;  // URL 或 Base64
  audio?: string;  // URL 或 Base64
}

/**
 * 多模态消息结构
 */
export interface MultimodalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentItem[];
}

/**
 * 媒体处理选项
 */
export interface MediaProcessingOptions {
  /** 图片最大边长（像素） */
  maxImageSize?: number;
  /** 图片质量（0-100） */
  imageQuality?: number;
  /** 音频比特率（kbps） */
  audioBitrate?: number;
  /** 是否压缩图片 */
  compressImage?: boolean;
  /** 是否转码音频 */
  transcodeAudio?: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_MEDIA_OPTIONS: MediaProcessingOptions = {
  maxImageSize: 1024,
  imageQuality: 80,
  audioBitrate: 16,
  compressImage: true,
  transcodeAudio: true,
};

/**
 * 文件大小限制（字节）
 */
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,  // 5MB
  audio: 10 * 1024 * 1024, // 10MB
  file: 20 * 1024 * 1024,  // 20MB（预留）
};

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * 支持的音频格式
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
];
