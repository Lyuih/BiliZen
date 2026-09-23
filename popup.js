const COMMENT_KEY = 'hideComments';
const RCMD_KEY = 'hideRcmd';
const UPS_KEY = 'blockedUps';

const toggleComment = document.getElementById('toggleComment');
const toggleRcmd = document.getElementById('toggleRcmd');
const listEl = document.getElementById('upList');
const countEl = document.getElementById('upCount');
const input = document.getElementById('upInput');
const addBtn = document.getElementById('upAdd');

function renderCommentToggle(hide) {
  toggleComment.checked = !!hide;
}

function renderRcmdToggle(hide) {
  toggleRcmd.checked = !!hide;
}

function renderUps(blockedUps) {
  const uids = Object.keys(blockedUps).sort((a, b) => blockedUps[b].ts - blockedUps[a].ts);
  countEl.textContent = uids.length ? `(${uids.length})` : '';
  if (!uids.length) {
    listEl.innerHTML = '<div class="up-empty">还没有拉黑任何UP主</div>';
    return;
  }
  listEl.innerHTML = '';
  for (const uid of uids) {
    const row = document.createElement('div');
    row.className = 'up-item';
    const name = document.createElement('span');
    name.className = 'up-name';
    name.textContent = blockedUps[uid].name; // textContent 防注入
    name.title = `${blockedUps[uid].name} (UID ${uid})`;
    const del = document.createElement('button');
    del.className = 'up-del';
    del.textContent = '✕';
    del.title = '取消拉黑';
    del.addEventListener('click', async () => {
      const { blockedUps: cur = {} } = await chrome.storage.local.get(UPS_KEY);
      delete cur[uid];
      await chrome.storage.local.set({ blockedUps: cur });
    });
    row.append(name, del);
    listEl.appendChild(row);
  }
}

chrome.storage.local.get(
  { [COMMENT_KEY]: true, [RCMD_KEY]: false, [UPS_KEY]: {} },
  (res) => {
    renderCommentToggle(res[COMMENT_KEY]);
    renderRcmdToggle(res[RCMD_KEY]);
    renderUps(res[UPS_KEY]);
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[COMMENT_KEY]) renderCommentToggle(changes[COMMENT_KEY].newValue);
  if (changes[RCMD_KEY]) renderRcmdToggle(changes[RCMD_KEY].newValue);
  if (changes[UPS_KEY]) renderUps(changes[UPS_KEY].newValue);
});

toggleComment.addEventListener('change', () => {
  chrome.storage.local.set({ [COMMENT_KEY]: toggleComment.checked });
});

toggleRcmd.addEventListener('change', () => {
  chrome.storage.local.set({ [RCMD_KEY]: toggleRcmd.checked });
});

async function addUp() {
  const raw = input.value.trim();
  const m = raw.match(/space\.bilibili\.com\/(\d+)/);
  const uid = m ? m[1] : /^\d+$/.test(raw) ? raw : null;
  if (!uid) {
    input.classList.add('err');
    setTimeout(() => input.classList.remove('err'), 1200);
    return;
  }
  addBtn.disabled = true;
  try {
    // 由 background 统一写黑名单并拉取昵称；列表经 storage.onChanged 自动刷新
    await chrome.runtime.sendMessage({ type: 'blockUp', uid });
    input.value = '';
  } finally {
    addBtn.disabled = false;
  }
}

addBtn.addEventListener('click', addUp);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addUp();
});
