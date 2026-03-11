/**
 * After Pack 钩子
 * 
 * 在打包完成后执行，用于：
 * - 清理不必要的文件
 * - 优化体积
 * - 生成校验和
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  
  console.log(`[AfterPack] 平台：${electronPlatformName}`);
  console.log(`[AfterPack] 输出目录：${appOutDir}`);

  // 计算文件哈希
  await generateChecksums(appOutDir);

  // 打印包大小
  const packageSize = await getDirectorySize(appOutDir);
  console.log(`[AfterPack] 包大小：${formatBytes(packageSize)}`);

  // 检查是否超过体积限制（150MB）
  const sizeLimit = 150 * 1024 * 1024; // 150MB
  if (packageSize > sizeLimit) {
    console.warn(`[AfterPack] ⚠️  包大小超过 ${formatBytes(sizeLimit)} 限制！`);
  } else {
    console.log(`[AfterPack] ✅ 包大小符合要求`);
  }
};

/**
 * 生成目录下所有文件的 SHA256 校验和
 */
async function generateChecksums(dir) {
  const checksumFile = path.join(dir, 'CHECKSUMS.txt');
  const files = getAllFiles(dir);
  
  let content = '# OpenCrab Checksums (SHA256)\n\n';
  
  for (const file of files) {
    const relativePath = path.relative(dir, file);
    const hash = await calculateFileHash(file);
    content += `${hash}  ${relativePath}\n`;
  }
  
  fs.writeFileSync(checksumFile, content);
  console.log(`[AfterPack] 已生成校验和文件：${checksumFile}`);
}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * 计算文件 SHA256 哈希
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 计算目录大小
 */
async function getDirectorySize(dir) {
  const files = getAllFiles(dir);
  let totalSize = 0;
  
  for (const file of files) {
    const stat = fs.statSync(file);
    totalSize += stat.size;
  }
  
  return totalSize;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
