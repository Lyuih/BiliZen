const COMMENT_TOGGLE_CLASS = 'bilizen-hide-comments';
const COMMENT_KEY = 'hideComments';
const UPS_STYLE_ID = 'bilizen-ups-style';
const UPS_KEY = 'blockedUps';
const REMOVED_STYLE_ID = 'bilizen-removed-style';
const REMOVED_KEY = 'removedVideos';
const REMOVED_LIMIT = 1000;

// 视频卡片容器：黑名单只在卡片内找 UP 主链接，避免误伤视频简介里的制作人员名单
const CARD_SELECTORS = [
  '.bili-video-card', // 首页推荐流、搜索结果
  '.video-page-card', // 视频页右侧相关推荐（宽卡）
  '.video-page-card-small', // 视频页右侧「接下来播放」列表
  '.video-card' // 旧版相关推荐、热门页
];

// 提供「不再推荐」按钮的容器（仅视频页右栏），广告卡等非视频卡会被自动跳过
const REMOVABLE_CARD_SELECTORS = ['.video-page-card-small', '.video-page-card'];

function applyCommentHide(hide) {
  document.documentElement.classList.toggle(COMMENT_TOGGLE_CLASS, !!hide);
}

function applyBlockedUps(blockedUps) {
  let style = document.getElementById(UPS_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = UPS_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  const uids = Object.keys(blockedUps || {});
  style.textContent = uids
    .map((uid) => {
      const targets = CARD_SELECTORS.map(
        (sel) => `${sel}:has(a[href*="space.bilibili.com/${uid}"])`
      );
      return `${targets.join(',\n')} { display: none !important; }`;
    })
    .join('\n');
}

function applyRemovedVideos(removedVideos) {
  let style = document.getElementById(REMOVED_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = REMOVED_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  const bvs = Object.keys(removedVideos || {});
  style.textContent = bvs
    .map((bv) => {
      const targets = CARD_SELECTORS.map(
        (sel) => `${sel}:has(a[href*="/video/${bv}"])`
      );
      return `${targets.join(',\n')} { display: none !important; }`;
    })
    .join('\n');
}

// ---------- 右栏推荐卡片的「不再推荐」按钮 ----------

let scanQueued = false;
function scheduleScan() {
  if (scanQueued) return;
  scanQueued = true;
  requestAnimationFrame(() => {
    scanQueued = false;
    injectDeleteButtons();
  });
}

function injectDeleteButtons() {
  for (const sel of REMOVABLE_CARD_SELECTORS) {
    for (const card of document.querySelectorAll(sel)) {
      if (card.querySelector(':scope > .bilizen-del-btn')) continue;
      if (!card.querySelector('a[href*="/video/BV"]')) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bilizen-del-btn';
      btn.textContent = '✕';
      btn.title = 'BiliZen：不再推荐该视频';
      btn.addEventListener('click', onRemoveClick);
      card.appendChild(btn);
    }
  }
}

async function onRemoveClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const btn = e.currentTarget;
  const card = btn.closest('.video-page-card-small, .video-page-card');
  // 点击时再读 href：卡片节点可能被 B 站复用到别的视频，避免拿注入时的旧 BV
  const bv = card
    ?.querySelector('a[href*="/video/BV"]')
    ?.getAttribute('href')
    ?.match(/\/video\/(BV[0-9A-Za-z]+)/)?.[1];
  if (!bv) return;
  const title = (card.querySelector('.title')?.textContent || card.textContent || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
  const { removedVideos = {} } = await chrome.storage.local.get(REMOVED_KEY);
  removedVideos[bv] = { title, ts: Date.now() };
  const entries = Object.entries(removedVideos).sort((a, b) => a[1].ts - b[1].ts);
  for (const [k] of entries.slice(0, Math.max(0, entries.length - REMOVED_LIMIT))) {
    delete removedVideos[k];
  }
  await chrome.storage.local.set({ removedVideos });
  btn.remove(); // 卡片即将被 CSS 隐藏，顺手移除按钮
}

// B 站会动态补充/复用列表节点，持续扫描注入按钮
new MutationObserver(scheduleScan).observe(document.documentElement, {
  childList: true,
  subtree: true
});

// document_start 阶段 documentElement 已存在，尽早套上 class / 样式避免闪现。
chrome.storage.local.get(
  { [COMMENT_KEY]: true, [UPS_KEY]: {}, [REMOVED_KEY]: {} },
  (res) => {
    applyCommentHide(res[COMMENT_KEY]);
    applyBlockedUps(res[UPS_KEY]);
    applyRemovedVideos(res[REMOVED_KEY]);
    scheduleScan();
  }
);

// popup / 右键菜单改动后，所有已打开的标签页实时生效。
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[COMMENT_KEY]) applyCommentHide(changes[COMMENT_KEY].newValue);
  if (changes[UPS_KEY]) applyBlockedUps(changes[UPS_KEY].newValue);
  if (changes[REMOVED_KEY]) applyRemovedVideos(changes[REMOVED_KEY].newValue);
});
