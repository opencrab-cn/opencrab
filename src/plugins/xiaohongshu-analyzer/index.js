/**
 * 小红书笔记分析器 - 主进程入口
 * 
 * 功能：
 * 1. 分析小红书笔记文本
 * 2. 调用 AI 模型生成分析报告
 * 3. 提供优化建议
 */

// 插件导出对象
const plugin = {
  /**
   * 插件初始化
   */
  async init(pluginAPI) {
    console.log('[XHS Analyzer] 插件初始化');
    
    // 注册到全局（供渲染进程调用）
    globalThis.xhsAnalyzer = {
      analyzeNote,
      generateReport,
    };
  },

  /**
   * 插件启用
   */
  async enable() {
    console.log('[XHS Analyzer] 插件已启用');
  },

  /**
   * 插件禁用
   */
  async disable() {
    console.log('[XHS Analyzer] 插件已禁用');
  },

  /**
   * 插件卸载
   */
  async unload() {
    console.log('[XHS Analyzer] 插件已卸载');
    delete globalThis.xhsAnalyzer;
  },

  /**
   * 配置变更
   */
  async onConfigChange(newConfig) {
    console.log('[XHS Analyzer] 配置已更新:', newConfig);
  },
};

/**
 * 分析小红书笔记
 */
async function analyzeNote(noteText, options = {}) {
  try {
    // 1. 文本预处理
    const parsed = parseNoteText(noteText);
    
    // 2. 构建分析提示词
    const prompt = buildAnalysisPrompt(parsed, options);
    
    // 3. 调用 AI 模型
    const messages = [
      { role: 'system', content: '你是一位资深的小红书运营专家，擅长分析爆款笔记的规律。' },
      { role: 'user', content: prompt },
    ];
    
    const result = await pluginAPI.chat(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    });
    
    if (!result.success) {
      throw new Error(result.error || '分析失败');
    }
    
    // 4. 解析 AI 返回结果
    const analysis = parseAnalysisResult(result.data.content);
    
    // 5. 生成结构化报告
    const report = generateStructuredReport(parsed, analysis);
    
    return {
      success: true,
      data: report,
    };
    
  } catch (error) {
    console.error('[XHS Analyzer] 分析失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 解析笔记文本
 */
function parseNoteText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  
  // 提取标题（通常第一行）
  const title = lines[0]?.trim() || '';
  
  // 提取正文
  const content = lines.slice(1).join('\n').trim();
  
  // 提取标签
  const tags = content.match(/#[^\s#]+/g) || [];
  
  // 提取表情符号
  const emojis = content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || [];
  
  // 清理标签后的正文
  const cleanContent = content.replace(/#[^\s#]+/g, '').trim();
  
  return {
    title,
    content: cleanContent,
    tags,
    emojis,
    wordCount: cleanContent.length,
    hasEmojis: emojis.length > 0,
  };
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(parsed, options) {
  return `请分析以下小红书笔记：

【标题】${parsed.title}

【正文】${parsed.content}

【标签】${parsed.tags.join(' ')}

【表情符号】${parsed.hasEmojis ? '有' : '无'}

请从以下维度进行分析：
1. 标题吸引力评分（0-10 分）及优化建议
2. 情绪倾向分析（积极/中立/消极）
3. 受众画像推测（基于用词和话题）
4. 评论预测（如果发布，可能收到哪些反馈）
5. 推荐优化方向
6. 推荐标签列表

目标受众：${options.targetAudience || '18-30 岁女性'}
分析深度：${options.analysisDepth || '详细'}

请以 JSON 格式返回分析结果。`;
}

/**
 * 解析 AI 分析结果
 */
function parseAnalysisResult(aiResponse) {
  try {
    // 尝试解析 JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 解析失败则使用默认结构
    return {
      titleScore: 5,
      titleSuggestions: ['可以尝试更吸引人的标题'],
      sentiment: '中立',
      audience: '年轻女性',
      predictedComments: ['内容不错', '求链接', '已收藏'],
      optimizationTips: ['增加互动性问题', '添加更多细节'],
      recommendedTags: ['#职场干货', '#成长思维', '#学习打卡'],
    };
  } catch (error) {
    console.error('[XHS Analyzer] 解析 AI 结果失败:', error);
    return null;
  }
}

/**
 * 生成结构化报告
 */
function generateStructuredReport(parsed, analysis) {
  return {
    summary: {
      title: parsed.title,
      wordCount: parsed.wordCount,
      hasEmojis: parsed.hasEmojis,
      tagCount: parsed.tags.length,
    },
    analysis: {
      titleScore: analysis?.titleScore || 0,
      titleSuggestions: analysis?.titleSuggestions || [],
      sentiment: analysis?.sentiment || '未知',
      audience: analysis?.audience || '未知',
      predictedComments: analysis?.predictedComments || [],
      optimizationTips: analysis?.optimizationTips || [],
      recommendedTags: analysis?.recommendedTags || [],
    },
    markdown: generateMarkdownReport(parsed, analysis),
  };
}

/**
 * 生成 Markdown 格式报告
 */
function generateMarkdownReport(parsed, analysis) {
  return `# 小红书笔记分析报告

## 📊 基础数据
- **标题**: ${parsed.title}
- **字数**: ${parsed.wordCount} 字
- **表情**: ${parsed.hasEmojis ? '✅' : '❌'}
- **标签数**: ${parsed.tags.length} 个

## 🎯 标题分析
**评分**: ${analysis?.titleScore || 0}/10

**优化建议**:
${analysis?.titleSuggestions?.map(s => `- ${s}`).join('\n') || '暂无建议'}

## 💭 情绪倾向
${analysis?.sentiment || '未知'}

## 👥 受众画像
${analysis?.audience || '未知'}

## 💬 评论预测
${analysis?.predictedComments?.map(c => `- ${c}`).join('\n') || '暂无预测'}

## ✨ 优化建议
${analysis?.optimizationTips?.map(t => `- ${t}`).join('\n') || '暂无建议'}

## 🏷️ 推荐标签
${analysis?.recommendedTags?.map(t => `${t}`).join(' ') || '暂无推荐'}
`;
}

// 导出插件
module.exports = plugin;
