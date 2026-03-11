/**
 * Notarize script for macOS
 * 
 * 在 codesign 之后执行，向 Apple 提交公证
 * 需要以下环境变量：
 * - APPLE_ID: Apple ID（邮箱）
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password
 * - APPLE_TEAM_ID: Apple Developer Team ID
 */

require('dotenv').config();
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // 仅在 macOS 平台执行
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 检查必需的环境变量
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('[Notarize] 缺少环境变量，跳过公证步骤');
    console.warn('需要设置：APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`[Notarize] 开始公证应用：${appPath}`);

  try {
    await notarize({
      appBundleId: 'com.opencrab.app',
      appPath,
      appleId,
      appleIdPassword,
      teamId,
      
      // 使用 notarytool（推荐）
      tool: 'notarytool',
      
      // 超时时间（毫秒）
      timeout: 10 * 60 * 1000, // 10 分钟
      
      // 轮询间隔（毫秒）
      pollingInterval: 5000, // 5 秒
    });

    console.log('[Notarize] ✅ 公证成功');
  } catch (error) {
    console.error('[Notarize] ❌ 公证失败:', error);
    throw error;
  }
};
