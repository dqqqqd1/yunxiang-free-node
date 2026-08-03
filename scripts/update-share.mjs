import { mkdir, writeFile } from 'node:fs/promises';

const SITE_URL = process.env.SITE_URL || 'https://free.yunxiang.lol/';
const PRODUCT_URL = process.env.PRODUCT_URL || 'https://user.yunxiangpnv.lol/';
const site = new URL(SITE_URL);

const homepageHtml = await fetchText(site);
const latestPostPath = findLatestNodePost(homepageHtml);
const latestPostUrl = new URL(latestPostPath, site).toString();
const postHtml = await fetchText(latestPostUrl);
const pageText = toText(postHtml);

const subscribeUrl = findSubscribeUrl(postHtml);
const title = textBetween(postHtml, /<h1[^>]*>/i, /<\/h1>/i) || `${dateFromPath(latestPostPath)}免费节点订阅`;
const date = dateFromPath(latestPostPath);
const displayDate = displayDateZh(date);
const nodeCount = findBetween(pageText, '节点数量', '主要地区') || '以页面实时记录为准';
const regions = findBetween(pageText, '主要地区', '订阅格式') || '香港、日本、新加坡、美国';
const updatedAt = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Shanghai',
}).format(new Date());

await mkdir('sub', { recursive: true });
await mkdir('history', { recursive: true });
await writeFile('README.md', renderReadme(), 'utf8');
await writeFile('sub/latest.txt', `${subscribeUrl}\n`, 'utf8');
await writeFile(`history/${date}.md`, renderHistory(), 'utf8');

console.log(`已更新 GitHub 分享内容：${date}`);
console.log(`最新文章：${latestPostUrl}`);
console.log(`订阅地址：${subscribeUrl}`);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'yunxiang-free-node-github-share/1.0',
      Accept: 'text/html,application/xml,text/plain,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`读取失败：${url} HTTP ${response.status}`);
  }

  return response.text();
}

function findLatestNodePost(html) {
  const matches = [...html.matchAll(/href=["'](\/posts\/nodes\/\d{4}-\d{2}-\d{2})["']/g)];
  if (!matches.length) {
    throw new Error('没有从首页找到最新免费节点文章链接。');
  }
  return matches[0][1];
}

function findSubscribeUrl(html) {
  const match = html.match(/https:\/\/user\.yunxiangpnv\.lol\/s\/[a-z0-9]+/i);
  if (!match) {
    throw new Error('没有从最新文章中找到免费订阅地址。');
  }
  return match[0];
}

function dateFromPath(path) {
  const match = path.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) throw new Error(`无法从路径解析日期：${path}`);
  return match[0];
}

function displayDateZh(date) {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function toText(html) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textBetween(html, startPattern, endPattern) {
  const start = html.search(startPattern);
  if (start < 0) return '';
  const afterStart = html.slice(start).replace(startPattern, '');
  const end = afterStart.search(endPattern);
  if (end < 0) return '';
  return toText(afterStart.slice(0, end));
}

function findBetween(text, start, end) {
  const index = text.indexOf(start);
  if (index < 0) return '';
  const rest = text.slice(index + start.length);
  const endIndex = rest.indexOf(end);
  return (endIndex >= 0 ? rest.slice(0, endIndex) : rest).trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderReadme() {
  return `# 云享免费节点订阅｜Clash / Mihomo / V2Ray / v2rayN 每日更新

> 每日自动同步一份可用于临时测试的免费节点订阅，适合 Clash Verge Rev、Mihomo、v2rayN、v2rayNG 等客户端导入。  
> 免费资源只适合学习配置、临时测试和备用连接，不承诺长期稳定可用。

## 今日免费订阅

| 项目 | 内容 |
| --- | --- |
| 更新日期 | ${displayDate} |
| 自动同步 | ${updatedAt} |
| 订阅格式 | XBoard 通用订阅 |
| 适配客户端 | Clash / Mihomo / v2rayN / v2rayNG |
| 节点地区 | ${regions} |
| 节点数量 | ${nodeCount} |
| 公共限速 | 100 Mbps |

\`\`\`text
${subscribeUrl}
\`\`\`

如果客户端支持从 URL 导入订阅，直接复制上方地址添加即可。  
如果订阅更新失败，请先确认客户端网络、系统时间、订阅格式和代理模式是否正确。

## 快速入口

- 今日节点详情：${latestPostUrl}
- 每日节点归档：${new URL('/nodes', site).toString()}
- 使用文档：${new URL('/docs', site).toString()}
- 导入订阅教程：${new URL('/docs/start/import-subscription', site).toString()}
- 稳定套餐入口：${PRODUCT_URL}

## 支持哪些客户端

### Windows / macOS / Linux

- Clash Verge Rev
- Mihomo Party
- v2rayN
- NekoRay

### Android / iOS

- v2rayNG
- FlClash
- Clash Meta 系客户端
- Shadowrocket / Stash 等支持订阅导入的客户端

不同客户端对订阅格式的识别能力不同。遇到无法导入、节点为空、配置格式错误时，优先查看本站文档：

\`\`\`text
${new URL('/docs', site).toString()}
\`\`\`

## 免费节点适合什么场景

免费订阅适合：

- 测试客户端是否安装正确
- 检查订阅导入流程
- 临时备用连接
- 学习 Clash / Mihomo / V2Ray 配置结构

不建议用于：

- 支付、银行、交易平台等敏感账户
- 企业后台、工作账号和长期业务连接
- 私人通信或长期固定线路
- 对稳定性、速度、售后有明确要求的场景

如果你需要更稳定的容量、独立订阅、售后支持和明确套餐规则，可以查看：

\`\`\`text
${PRODUCT_URL}
\`\`\`

## 每日更新规则

本仓库由 GitHub Actions 每天自动更新。旧记录保留原日期，不会把历史内容伪装成最新更新。  
免费节点受在线人数、线路负载、节点维护和地区网络影响，实际可用性以客户端测试结果为准。

建议导入后按这个顺序检查：

1. 更新订阅。
2. 测试延迟。
3. 选择低延迟节点。
4. 开启系统代理或 TUN。
5. 打开测试网站确认网络是否正常。

## 常见问题

### 订阅导入后没有节点？

先检查订阅地址是否复制完整，再换一个支持 XBoard 通用订阅的客户端。  
如果浏览器打开订阅地址返回空白、403、404 或登录页，说明当前订阅可能已失效。

### 节点能测速但不能上网？

检查系统代理、TUN、DNS、客户端核心和系统时间。  
详细排查看：

\`\`\`text
${new URL('/docs/troubleshooting/no-internet', site).toString()}
\`\`\`

### 免费节点为什么会失效？

公共订阅通常多人共享，节点负载、线路维护、订阅刷新都会影响可用性。  
免费节点适合作为临时测试，不适合作为长期主力线路。

## 免责声明

本仓库只整理公开订阅记录、客户端导入教程和网络配置学习资料。  
请遵守所在地法律法规、软件许可协议和网络服务条款。  
请勿将公共免费节点用于隐私数据、支付账户、企业后台或任何高风险业务场景。

## 相关链接

- 官网：${site.toString()}
- 免费节点归档：${new URL('/nodes', site).toString()}
- 使用文档：${new URL('/docs', site).toString()}
- RSS：${new URL('/rss.xml', site).toString()}
- 付费稳定套餐：${PRODUCT_URL}
`;
}

function renderHistory() {
  return `# ${date} 免费节点订阅

订阅地址：

\`\`\`text
${subscribeUrl}
\`\`\`

今日记录：

- 标题：${title}
- 节点数量：${nodeCount}
- 主要地区：${regions}
- 公共限速：100 Mbps
- 详情页面：${latestPostUrl}

免费节点只适合临时测试和客户端配置学习，不建议用于敏感账户、支付或长期业务连接。
`;
}
