const STORAGE_KEY = 'hideComments';
const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

function render(hide) {
  toggle.checked = !!hide;
  status.textContent = hide ? '评论区已隐藏' : '评论区显示中';
}

chrome.storage.local.get({ [STORAGE_KEY]: true }, (res) => render(res[STORAGE_KEY]));

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ [STORAGE_KEY]: toggle.checked });
  render(toggle.checked);
});
