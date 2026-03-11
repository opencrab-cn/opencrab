/**
 * 流式响应渲染工具
 * 
 * 解析 SSE 流数据、Markdown 渲染、代码高亮
 */

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

/**
 * 配置 Markdown 解析器
 */
const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    // 代码块高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch (e) {
        console.error('[Markdown] 代码高亮失败:', e);
      }
    }
    // 默认转义
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

/**
 * 自定义链接渲染（添加 target="_blank"）
 */
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']);
    tokens[idx].attrPush(['rel', 'noopener noreferrer']);
  } else if (tokens[idx].attrs && tokens[idx].attrs[aIndex]) {
    tokens[idx].attrs[aIndex][1] = '_blank';
  }
  return self.renderToken(tokens, idx, options);
};

/**
 * 流式文本渲染器类
 * 
 * 特性：
 * - 增量解析 Markdown
 * - 防抖处理
 * - 代码块自动高亮
 */
export class StreamRenderer {
  private buffer: string = '';
  private renderedContent: string = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onUpdateCallback: ((html: string) => void) | null = null;

  /**
   * 设置更新回调
   */
  setOnUpdate(callback: (html: string) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * 添加新的文本块
   */
  append(text: string): void {
    this.buffer += text;
    
    // 触发防抖更新
    this.scheduleRender();
  }

  /**
   * 完成流式传输
   */
  finish(): string {
    // 立即渲染剩余内容
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.renderedContent = this.renderMarkdown(this.buffer);
    this.notifyUpdate();
    
    return this.renderedContent;
  }

  /**
   * 获取当前渲染的内容
   */
  getContent(): string {
    return this.renderedContent;
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = '';
    this.renderedContent = '';
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * 调度渲染（防抖）
   */
  private scheduleRender(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 50ms 防抖，平衡性能与流畅度
    this.debounceTimer = setTimeout(() => {
      this.renderedContent = this.renderMarkdown(this.buffer);
      this.notifyUpdate();
    }, 50);
  }

  /**
   * 渲染 Markdown
   */
  private renderMarkdown(text: string): string {
    try {
      return md.render(text);
    } catch (error) {
      console.error('[StreamRenderer] Markdown 渲染失败:', error);
      // 降级处理：直接返回纯文本
      return this.escapeHtml(text);
    }
  }

  /**
   * HTML 转义（降级处理用）
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 通知更新
   */
  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.renderedContent);
    }
  }
}

/**
 * 创建新的流式渲染器实例
 */
export function createStreamRenderer(): StreamRenderer {
  return new StreamRenderer();
}

/**
 * 辅助函数：将纯文本转换为安全的 HTML
 */
export function renderPlainText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // 保留换行
  return escaped.replace(/\n/g, '<br>');
}

/**
 * 辅助函数：提取 Markdown 中的纯文本内容
 */
export function extractTextFromMarkdown(markdown: string): string {
  // 简单实现：移除 Markdown 语法
  return markdown
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]+`/g, '') // 移除行内代码
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体
    .replace(/\*([^*]+)\*/g, '$1') // 移除斜体
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接
    .replace(/^#\s+/gm, '') // 移除标题
    .replace(/^\s*[-*+]\s+/gm, '') // 移除列表
    .trim();
}
