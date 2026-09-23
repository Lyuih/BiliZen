const COMMENT_KEY = 'hideComments';
const UPS_KEY = 'blockedUps';
const REMOVED_KEY = 'removedVideos';

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const listEl = document.getElementById('upList');
const countEl = document.getElementById('upCount');
const input = document.getElementById('upInput');
const addBtn = document.getElementById('upAdd');
const rmListEl = document.getElementById('rmList');
const rmCountEl = document.getElementById('rmCount');

function renderComments(hide) {
  toggle.checked = !!hide;
  status.textContent = hide ? '评论区已隐藏' : '评论区显示中';
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

function renderRemoved(removedVideos) {
  const bvs = Object.keys(removedVideos).sort((a, b) => removedVideos[b].ts - removedVideos[a].ts);
  rmCountEl.textContent = bvs.length ? `(${bvs.length})` : '';
  if (!bvs.length) {
    rmListEl.innerHTML = '<div class="up-empty">还没有删除过推荐视频</div>';
    return;
  }
  rmListEl.innerHTML = '';
  for (const bv of bvs) {
    const row = document.createElement('div');
    row.className = 'up-item';
    const title = document.createElement('span');
    title.className = 'up-name';
    title.textContent = removedVideos[bv].title || bv;
    title.title = `${removedVideos[bv].title || ''} (${bv})`;
    const restore = document.createElement('button');
    restore.className = 'up-restore';
    restore.textContent = '↺';
    restore.title = '恢复推荐';
    restore.addEventListener('click', async () => {
      const { removedVideos: cur = {} } = await chrome.storage.local.get(REMOVED_KEY);
      delete cur[bv];
      await chrome.storage.local.set({ removedVideos: cur });
    });
    row.append(title, restore);
    rmListEl.appendChild(row);
  }
}

chrome.storage.local.get(
  { [COMMENT_KEY]: true, [UPS_KEY]: {}, [REMOVED_KEY]: {} },
  (res) => {
    renderComments(res[COMMENT_KEY]);
    renderUps(res[UPS_KEY]);
    renderRemoved(res[REMOVED_KEY]);
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[COMMENT_KEY]) renderComments(changes[COMMENT_KEY].newValue);
  if (changes[UPS_KEY]) renderUps(changes[UPS_KEY].newValue);
  if (changes[REMOVED_KEY]) renderRemoved(changes[REMOVED_KEY].newValue);
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ [COMMENT_KEY]: toggle.checked });
  renderComments(toggle.checked);
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
