// 拉黑入口的唯一写入口：右键菜单和 popup 都通过这里写黑名单。

const MENU_ID = 'bilizen-block-up';
const BLOCK_KEY = 'blockedUps';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // targetUrlPatterns 限定：只在 UP 主主页链接上显示这一项
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'BiliZen：拉黑该UP主',
      contexts: ['link'],
      targetUrlPatterns: ['*://space.bilibili.com/*']
    });
  });
});

async function fetchUpName(uid) {
  try {
    const res = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`);
    const data = await res.json();
    return data?.data?.card?.name || null;
  } catch {
    return null;
  }
}

async function blockUp(uid) {
  const { blockedUps = {} } = await chrome.storage.local.get(BLOCK_KEY);
  const name = blockedUps[uid]?.name || (await fetchUpName(uid)) || `UID ${uid}`;
  blockedUps[uid] = { name, ts: Date.now() };
  await chrome.storage.local.set({ blockedUps });
  return name;
}

function flashBadge() {
  chrome.action.setBadgeBackgroundColor({ color: '#fb7299' });
  chrome.action.setBadgeText({ text: '+1' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1500);
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const m = (info.linkUrl || '').match(/space\.bilibili\.com\/(\d+)/);
  if (!m) return;
  await blockUp(m[1]);
  flashBadge();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'blockUp' && /^\d+$/.test(msg.uid || '')) {
    blockUp(msg.uid).then((name) => sendResponse({ ok: true, name }));
    return true; // 保持消息通道开放，等待异步 sendResponse
  }
});
