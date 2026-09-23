const COMMENT_TOGGLE_CLASS = 'bilizen-hide-comments';
const COMMENT_KEY = 'hideComments';
const UPS_STYLE_ID = 'bilizen-ups-style';
const UPS_KEY = 'blockedUps';

// 视频卡片容器：黑名单只在卡片内找 UP 主链接，避免误伤视频简介里的制作人员名单
const CARD_SELECTORS = [
  '.bili-video-card', // 首页推荐流、搜索结果
  '.video-page-card', // 视频页右侧相关推荐（宽卡）
  '.video-page-card-small', // 视频页右侧「接下来播放」列表
  '.video-card' // 旧版相关推荐、热门页
];

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

// document_start 阶段 documentElement 已存在，尽早套上 class / 样式避免闪现。
chrome.storage.local.get({ [COMMENT_KEY]: true, [UPS_KEY]: {} }, (res) => {
  applyCommentHide(res[COMMENT_KEY]);
  applyBlockedUps(res[UPS_KEY]);
});

// popup / 右键菜单改动后，所有已打开的标签页实时生效。
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[COMMENT_KEY]) applyCommentHide(changes[COMMENT_KEY].newValue);
  if (changes[UPS_KEY]) applyBlockedUps(changes[UPS_KEY].newValue);
});
