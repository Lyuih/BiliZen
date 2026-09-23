const TOGGLE_CLASS = 'bilizen-hide-comments';
const STORAGE_KEY = 'hideComments';

function apply(hide) {
  document.documentElement.classList.toggle(TOGGLE_CLASS, !!hide);
}

// document_start 阶段 documentElement 已存在，尽早套上 class 避免评论区闪现。
chrome.storage.local.get({ [STORAGE_KEY]: true }, (res) => apply(res[STORAGE_KEY]));

// popup 切换后所有已打开的标签页实时生效。
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) apply(changes[STORAGE_KEY].newValue);
});
