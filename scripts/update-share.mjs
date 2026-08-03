import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SITE_URL = normalizeSiteUrl(process.env.SITE_URL || 'https://free.yunxiang.lol');
const PRODUCT_URL = normalizeSiteUrl(process.env.PRODUCT_URL || process.env.PUBLIC_PRODUCT_URL || 'https://user.yunxiangpnv.lol/');
const SHARE_DIR = resolve(
  process.env.GITHUB_SHARE_DIR || (process.cwd().replace(/\\/g, '/').endsWith('/github-share') ? '.' : 'github-share'),
);

const latest = normalizeRecord(await fetchLatestRecord());
const links = buildLinks(latest);
const files = new Map([
  ['README.md', renderReadme(latest, links)],
  ['sub/latest.txt', `${links.article}\n`],
  [`history/${latest.date}.md`, renderHistory(latest, links)],
]);

for (const [path, content] of files) {
  assertNoSubscriptionLeak(content, latest);
  await writeLocal(path, content);
}

console.log(`GitHub 分享内容已更新：${latest.date}`);

async function fetchLatestRecord() {
  const response = await fetch(new URL('/api/free-node/latest', SITE_URL), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'yunxiang-github-action-share/2.0',
    },
  });

  if (!response.ok) {
    throw new Error(`读取免费节点数据失败：HTTP ${response.status}`);
  }

  return response.json();
}

function normalizeRecord(record) {
  if (!record?.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    throw new Error('免费节点记录缺少合法日期。');
  }

  const [year, month, day] = record.date.split('-').map(Number);
  const regions = Array.isArray(record.regions) && record.regions.length
    ? record.regions.map(String)
    : ['香港', '日本', '新加坡', '美国'];

  return {
    ...record,
    displayDate: record.displayDate || `${year}年${month}月${day}日`,
    title: record.title || `${year}年${month}月${day}日免费节点订阅：XBoard 通用订阅地址`,
    description:
      record.description ||
      `${year}年${month}月${day}日免费节点订阅已刷新，提供 Clash、Mihomo、V2Ray 客户端可用的每日文章入口。`,
    nodeCount: Number(record.nodeCount || 0),
    regions,
    speedLimitMbps: Number(record.speedLimitMbps || 100),
    transferGb: Number(record.transferGb || 100),
    updatedAt: record.updatedAt || new Date().toISOString(),
    subscribeUrl: record.subscribeUrl || '',
  };
}

function buildLinks(record) {
  return {
    home: SITE_URL,
    article: new URL(`/posts/nodes/${record.date}`, SITE_URL).toString(),
    nodes: new URL('/nodes', SITE_URL).toString(),
    docs: new URL('/docs', SITE_URL).toString(),
    importGuide: new URL('/docs/start/import-subscription', SITE_URL).toString(),
    troubleshoot: new URL('/docs/troubleshooting/no-internet', SITE_URL).toString(),
    rss: new URL('/rss.xml', SITE_URL).toString(),
    paid: PRODUCT_URL,
  };
}

function renderReadme(record, links) {
  const nodeCountText = record.nodeCount ? `${record.nodeCount} 条` : '以博客文章实时记录为准';
  const regionText = record.regions.join('、');

  return `# 云享免费节点分享 | Clash / Mihomo / V2Ray 每日更新

> 本仓库只同步每日免费节点文章入口、使用说明和归档记录。真实免费订阅地址不在 GitHub 直接公开，请进入当天博客文章查看。

## 今日获取入口

| 项目 | 内容 |
| --- | --- |
| 更新日期 | ${record.displayDate} |
| 自动同步时间 | ${formatShanghai(record.updatedAt)} |
| 当天文章 | ${links.article} |
| 订阅格式 | XBoard 通用订阅 |
| 适配客户端 | Clash Verge Rev / Mihomo Party / v2rayN / v2rayNG / Shadowrocket |
| 主要地区 | ${regionText} |
| 节点数量 | ${nodeCountText} |
| 公共限速 | ${record.speedLimitMbps} Mbps |
| 流量容量 | ${record.transferGb} GB |

### 当天文章链接

\`\`\`text
${links.article}
\`\`\`

请打开上面的博客文章，在正文的“免费订阅地址”区域获取当天可用链接。GitHub 只做索引和分发入口，这样能把更新说明、导入教程、使用边界和失效提示集中到同一篇文章里。

## 快速入口

- 今日免费节点文章：${links.article}
- 每日免费节点归档：${links.nodes}
- 订阅导入教程：${links.importGuide}
- 常见问题文档：${links.docs}
- 连接异常排查：${links.troubleshoot}
- RSS 更新源：${links.rss}
- 稳定付费套餐：${links.paid}

## 今日数据说明

本站每日北京时间 00:00 自动处理免费节点用户：重置流量、刷新订阅 Token、写入服务端动态数据，并同步 GitHub 分享仓库。GitHub 仓库里的 \`sub/latest.txt\` 只保存当天文章链接，不保存真实订阅地址。

免费节点适合临时测试、客户端配置学习和短时间备用连接。如果需要更稳定的容量、独立订阅和售后支持，可以查看稳定套餐：

\`\`\`text
${links.paid}
\`\`\`

## 客户端兼容

- Windows / macOS / Linux：Clash Verge Rev、Mihomo Party、v2rayN、NekoRay
- Android / iOS：v2rayNG、FlClash、Shadowrocket、Stash 等支持订阅导入的客户端

不同客户端对订阅格式的识别能力不同。遇到无法导入、节点为空、配置格式错误时，优先查看文档：

\`\`\`text
${links.docs}
\`\`\`

## 常见问题

### 为什么 GitHub 不直接放订阅地址？

这个仓库用于每日内容同步和文章分发。真实订阅地址统一在博客正文展示，方便做说明、更新、失效提示和 SEO 归档，也避免过期地址在 GitHub 长期扩散。

### 打开文章后怎么获取订阅？

进入当天文章，在正文的“免费订阅地址”区域复制链接即可：

\`\`\`text
${links.article}
\`\`\`

### 订阅导入后无法联网怎么办？

优先检查系统代理、TUN、DNS、客户端核心和系统时间。排查文档：

\`\`\`text
${links.troubleshoot}
\`\`\`

## 相关链接

- 官方博客：${links.home}
- 每日节点归档：${links.nodes}
- 使用文档：${links.docs}
- RSS：${links.rss}
- 稳定付费套餐：${links.paid}
`;
}

function renderHistory(record, links) {
  const nodeCountText = record.nodeCount ? `${record.nodeCount} 条` : '以博客文章实时记录为准';

  return `# ${record.date} 免费节点订阅文章

这个日期的 GitHub 记录只保留文章入口，不直接公开真实订阅地址。

## 当天文章

\`\`\`text
${links.article}
\`\`\`

## 当天记录

- 标题：${record.title}
- 摘要：${record.description}
- 节点数量：${nodeCountText}
- 主要地区：${record.regions.join('、')}
- 公共限速：${record.speedLimitMbps} Mbps
- 流量容量：${record.transferGb} GB
- 同步时间：${formatShanghai(record.updatedAt)}
- 导入教程：${links.importGuide}
- 稳定付费入口：${links.paid}

请进入当天博客文章，在正文中获取订阅地址。免费节点适合临时测试和客户端配置学习，不建议用于敏感账号、支付或长期主力线路。
`;
}

async function writeLocal(path, content) {
  const target = resolve(SHARE_DIR, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

function assertNoSubscriptionLeak(content, record) {
  if (record.subscribeUrl && content.includes(record.subscribeUrl)) {
    throw new Error('检测到真实订阅地址，已停止更新 GitHub 内容。');
  }

  if (/user\.yunxiangpnv\.lol\/s\//i.test(content)) {
    throw new Error('检测到疑似真实订阅地址，已停止更新 GitHub 内容。');
  }

  if (/https?:\/\/[^\s)>"']+\/s\/[A-Za-z0-9._~-]{12,}/i.test(content)) {
    throw new Error('检测到疑似订阅 Token 链接，已停止更新 GitHub 内容。');
  }
}

function normalizeSiteUrl(value) {
  const url = new URL(value.endsWith('/') ? value : `${value}/`);
  return url.toString();
}

function formatShanghai(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value || '刚刚';

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(date);
}
