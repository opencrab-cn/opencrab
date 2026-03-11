/**
 * 中文公文写作助手 - 主进程入口
 * 
 * 功能：
 * 1. 提供公文模板库（通知/请示/函/会议纪要等）
 * 2. 基于模板生成初稿
 * 3. 支持多轮修改
 * 4. 格式校验和敏感词检测
 */

// 公文模板库
const DOCUMENT_TEMPLATES = {
  notice: {
    name: '通知',
    template: `关于${topic}的通知

${targetAudience}：

根据${basis}，为做好${purpose}工作，现将有关事项通知如下：

一、${content1}

二、${content2}

三、${content3}

请认真贯彻执行。

${organization}
${date}`,
  },
  
  request: {
    name: '请示',
    template: `关于${topic}的请示

${superior}:

${background}。为${purpose}，拟${plan}。

妥否，请批示。

${organization}
${date}`,
  },
  
  letter: {
    name: '函',
    template: `关于${topic}的函

${recipient}:

${opening}。经研究，现函告如下：

一、${content1}

二、${content2}

特此函告。

${organization}
${date}`,
  },
  
  minutes: {
    name: '会议纪要',
    template: `${meetingName}会议纪要

时间：${time}
地点：${location}
主持人：${host}
参会人员：${attendees}
记录人：${recorder}

${date}，${host}主持召开了${meetingName}。会议听取了${reportContent}，研究了${discussContent}。

会议强调：

一、${emphasis1}

二、${emphasis2}

三、${emphasis3}

会议要求：

一、${requirement1}

二、${requirement2}

三、${requirement3}

${organization}
${date}`,
  },
  
  summary: {
    name: '工作总结',
    template: `${period}工作总结

${time}以来，在${leadership}的正确领导下，${organization}紧紧围绕${centerWork}，扎实推进各项工作，取得了明显成效。现将工作情况总结如下：

一、主要工作及成效

（一）${work1}

（二）${work2}

（三）${work3}

二、存在的问题和不足

一是${problem1}

二是${problem2}

三是${problem3}

三、下一步工作打算

（一）${plan1}

（二）${plan2}

（三）${plan3}

${organization}
${date}`,
  },
};

// 敏感词库（示例）
const SENSITIVE_WORDS = [
  // 添加需要检测的敏感词
];

// 插件导出对象
const plugin = {
  /**
   * 插件初始化
   */
  async init(pluginAPI) {
    console.log('[Doc Writer] 插件初始化');
    
    // 注册到全局
    globalThis.docWriter = {
      generateDocument,
      reviseDocument,
      checkFormat,
      checkSensitiveWords,
      exportDocument,
    };
    
    // 加载模板库
    globalThis.docWriter.templates = DOCUMENT_TEMPLATES;
  },

  /**
   * 插件启用
   */
  async enable() {
    console.log('[Doc Writer] 插件已启用');
  },

  /**
   * 插件禁用
   */
  async disable() {
    console.log('[Doc Writer] 插件已禁用');
  },

  /**
   * 插件卸载
   */
  async unload() {
    console.log('[Doc Writer] 插件已卸载');
    delete globalThis.docWriter;
  },

  /**
   * 配置变更
   */
  async onConfigChange(newConfig) {
    console.log('[Doc Writer] 配置已更新:', newConfig);
  },
};

/**
 * 生成公文
 */
async function generateDocument(templateType, variables) {
  try {
    const template = DOCUMENT_TEMPLATES[templateType];
    if (!template) {
      throw new Error('无效的模板类型');
    }
    
    // 替换模板变量
    let content = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      content = content.replace(regex, value || '');
    }
    
    // 调用 AI 润色
    const polished = await polishWithAI(content);
    
    return {
      success: true,
      data: {
        title: template.name,
        content: polished,
        format: 'text',
      },
    };
    
  } catch (error) {
    console.error('[Doc Writer] 生成失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 修改公文（多轮对话）
 */
async function reviseDocument(document, revisionRequest) {
  try {
    const messages = [
      { 
        role: 'system', 
        content: '你是一位专业的公文写作助手，擅长根据用户要求修改公文，使其更加规范、准确、简洁。' 
      },
      { 
        role: 'user', 
        content: `请帮我修改以下公文：

${document}

修改要求：${revisionRequest}` 
      },
    ];
    
    const result = await pluginAPI.chat(messages, {
      temperature: 0.5,
      maxTokens: 3000,
    });
    
    if (!result.success) {
      throw new Error(result.error || '修改失败');
    }
    
    return {
      success: true,
      data: result.data.content,
    };
    
  } catch (error) {
    console.error('[Doc Writer] 修改失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * AI 润色
 */
async function polishWithAI(content) {
  try {
    const messages = [
      { 
        role: 'system', 
        content: '你是一位专业的公文润色助手，擅长将口语化或不规范的文本改为符合《党政机关公文格式》标准的正式公文语言。保持原意不变，使表达更加准确、简洁、规范。' 
      },
      { 
        role: 'user', 
        content: `请润色以下公文内容：\n\n${content}` 
      },
    ];
    
    const result = await pluginAPI.chat(messages, {
      temperature: 0.3,
      maxTokens: 3000,
    });
    
    if (result.success) {
      return result.data.content;
    }
    
    return content; // 润色失败返回原文
    
  } catch (error) {
    console.error('[Doc Writer] AI 润色失败:', error);
    return content;
  }
}

/**
 * 格式检查
 */
function checkFormat(content) {
  const issues = [];
  
  // 检查标题是否完整
  if (!content.includes('关于') || !content.includes('的')) {
    issues.push('标题格式可能不规范，建议包含"关于...的..."结构');
  }
  
  // 检查是否有落款
  if (!content.match(/.{2,}年.{1,2}月.{1,2}日/)) {
    issues.push('缺少日期或日期格式不规范');
  }
  
  // 检查是否有发文单位
  const lines = content.split('\n').filter(line => line.trim());
  const lastLine = lines[lines.length - 1]?.trim() || '';
  if (lastLine.length < 2 || !isNaN(parseInt(lastLine[0]))) {
    issues.push('缺少发文单位或位置不当');
  }
  
  // 检查序号使用
  const hasCorrectSequence = /一、/.test(content) && /（一）/.test(content);
  if (!hasCorrectSequence && content.includes('一')) {
    issues.push('序号使用可能不规范，建议：一、（一）1.（1）');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * 敏感词检查
 */
function checkSensitiveWords(content) {
  const found = [];
  
  for (const word of SENSITIVE_WORDS) {
    if (content.includes(word)) {
      found.push(word);
    }
  }
  
  return {
    hasSensitiveWords: found.length > 0,
    words: found,
  };
}

/**
 * 导出公文
 */
async function exportDocument(content, format, filePath) {
  try {
    // TODO: 实现文件导出（需要 fs:write 权限）
    console.warn('[Doc Writer] exportDocument 暂未实现');
    
    return {
      success: false,
      error: '暂未实现',
    };
    
  } catch (error) {
    console.error('[Doc Writer] 导出失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 导出插件
module.exports = plugin;
