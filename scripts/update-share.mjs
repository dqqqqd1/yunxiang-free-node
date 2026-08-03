import { mkdir, writeFile } from 'node:fs/promises';

const SITE_URL = process.env.SITE_URL || 'https://free.yunxiang.lol/';
const PRODUCT_URL = process.env.PRODUCT_URL || 'https://user.yunxiangpnv.lol/';
const site = new URL(SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`);

const homepageHtml = await fetchText(site.toString());
const latestPostPath = findLatestNodePost(homepageHtml);
const latestPostUrl = new URL(latestPostPath, site).toString();
const postHtml = await fetchText(latestPostUrl);
const pageText = toText(postHtml);

const date = dateFromPath(latestPostPath);
const title = textBetween(postHtml, /<h1[^>]*>/i, /<\/h1>/i) || `${date} 免费节点订阅`;
const displayDate = displayDateZh(date);
const nodeCount = findBetween(pageText, '节点数量', '主要地区') || '以页面实时记录为准';
const regions = findBetween(pageText, '主要地区', '订阅格式') || '香港、日本、新加坡、美国';
const updatedAt = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Shanghai',
}).format(new Date());

const nodesUrl = new URL('/nodes', site).toString();
const docsUrl = new URL('/docs', site).toString();
const importGuideUrl = new URL('/docs/start/import-subscription', site).toString();
const troubleshootUrl = new URL('/docs/troubleshooting/no-internet', site).toString();
const rssUrl = new URL('/rss.xml', site).toString();

await mkdir('sub', { recursive: true });
await mkdir('history', { recursive: true });
await writeFile('README.md', renderReadme(), 'utf8');
await writeFile('sub/latest.txt', `${latestPostUrl}\n`, 'utf8');
await writeFile(`history/${date}.md`, renderHistory(), 'utf8');

console.log(`已更新 GitHub 引流内容：${date}`);
console.log(`最新文章：${latestPostUrl}`);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'yunxiang-free-node-github-share/2.0',
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
  return `# 云享免费节点订阅 | Clash / Mihomo / V2Ray / v2rayN 每日更新

> 这个仓库只同步每日节点文章入口、导入教程和使用说明。
> 真实订阅地址不在 GitHub 直接公开，请到博客正文获取当天链接。

## 今日获取入口

| 项目 | 内容 |
| --- | --- |
| 更新日期 | ${displayDate} |
| 自动同步 | ${updatedAt} |
| 订阅格式 | XBoard 通用订阅 |
| 适配客户端 | Clash / Mihomo / v2rayN / v2rayNG |
| 节点地区 | ${regions} |
| 节点数量 | ${nodeCount} |
| 公共限速 | 100 Mbps |

### 当天文章

\`\`\`text
${latestPostUrl}
\`\`\`

请打开上面的博客文章，在正文中获取当天可用的免费订阅地址。

## 快速入口

- 今日节点详情：${latestPostUrl}
- 每日节点归档：${nodesUrl}
- 使用文档：${docsUrl}
- 导入订阅教程：${importGuideUrl}
- 稳定付费入口：${PRODUCT_URL}

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
${docsUrl}
\`\`\`

## 使用边界

免费内容更适合：

- 临时测试客户端是否安装正确
- 学习 Clash / Mihomo / V2Ray 的导入流程
- 短时备用连接

不建议用于：

- 支付、银行、交易平台等敏感账户
- 企业后台、工作账号和长期业务连接
- 对稳定性、售后和独立资源有明确要求的场景

如果需要更稳定的容量、独立订阅和售后支持，可查看：

\`\`\`text
${PRODUCT_URL}
\`\`\`

## 常见问题

### 为什么 GitHub 不直接放订阅地址

这个仓库的作用是做每日内容同步和文章分发，真实订阅地址统一在博客正文展示，方便做说明、更新和失效提示。

### 打开文章后怎么获取订阅

直接进入当天文章，在正文的订阅区域复制链接即可：

\`\`\`text
${latestPostUrl}
\`\`\`

### 订阅导入后无法联网怎么办

优先检查系统代理、TUN、DNS、客户端核心和系统时间。详细排查文档：

\`\`\`text
${troubleshootUrl}
\`\`\`

## 相关链接

- 官网：${site.toString()}
- 每日节点归档：${nodesUrl}
- 使用文档：${docsUrl}
- RSS：${rssUrl}
- 付费稳定套餐：${PRODUCT_URL}
`;
}

function renderHistory() {
  return `# ${date} 免费节点订阅

这个日期的 GitHub 记录只保留文章入口，不直接公开真实订阅地址。

## 当天文章

\`\`\`text
${latestPostUrl}
\`\`\`

## 今日记录

- 标题：${title}
- 节点数量：${nodeCount}
- 主要地区：${regions}
- 公共限速：100 Mbps
- 导入教程：${importGuideUrl}
- 稳定付费入口：${PRODUCT_URL}

请进入当天文章，在正文中获取订阅地址。免费节点更适合临时测试和客户端配置学习，不建议用于敏感账户、支付或长期主力线路。`;
}
