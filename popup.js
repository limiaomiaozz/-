const query = new URLSearchParams(location.search);
const tabId = Number(query.get('tabId'));
const state = { page: null, output: null, type: null, requestId: null };

const el = {
  pageName: document.querySelector('#page-name'), status: document.querySelector('#status'), result: document.querySelector('#result'),
  title: document.querySelector('#result-title'), url: document.querySelector('#result-url'), time: document.querySelector('#result-time'), content: document.querySelector('#result-content'),
  summarize: document.querySelector('#summarize'), translate: document.querySelector('#translate'), save: document.querySelector('#save-local'), terminate: document.querySelector('#terminate'), noLocal: document.querySelector('#no-local'),
  language: document.querySelector('#target-language'), settings: document.querySelector('#settings'), settingsToggle: document.querySelector('#settings-toggle'), key: document.querySelector('#api-key'), apiUrl: document.querySelector('#api-url'), model: document.querySelector('#model'), saveSettings: document.querySelector('#save-settings')
};

document.addEventListener('DOMContentLoaded', init);
el.summarize.addEventListener('click', () => run('summarize'));
el.translate.addEventListener('click', () => run('translate'));
el.save.addEventListener('click', saveMarkdown);
el.noLocal.addEventListener('click', () => { el.status.textContent = '结果仅显示，不会保存到本地。'; });
el.terminate.addEventListener('click', terminate);
el.settingsToggle.addEventListener('click', () => { el.settings.hidden = !el.settings.hidden; });
el.saveSettings.addEventListener('click', saveSettings);

async function init() {
  const settings = await chrome.storage.local.get({ apiKey: '', apiUrl: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' });
  el.key.value = settings.apiKey; el.apiUrl.value = settings.apiUrl; el.model.value = settings.model;
  if (!tabId) { el.status.textContent = '未找到要处理的网页，请从网页工具栏图标打开。'; return; }
  try {
    const response = await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE', tabId });
    if (!response.ok) throw new Error(response.error);
    state.page = response.page;
    el.pageName.textContent = state.page.title;
  } catch (error) { el.status.textContent = `无法读取网页：${error.message}`; }
}

async function run(type) {
  if (!state.page) return;
  const config = await chrome.storage.local.get(['apiKey', 'apiUrl', 'model']);
  if (!config.apiKey) { el.settings.hidden = false; el.status.textContent = '请先在设置中填写 API Key。'; return; }
  state.requestId = crypto.randomUUID(); state.type = type; setBusy(true);
  el.status.textContent = type === 'summarize' ? 'AI 正在总结网页内容…' : `AI 正在翻译为${el.language.value || '中文'}…`;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'AI_REQUEST', requestId: state.requestId, task: type, targetLanguage: el.language.value.trim() || '中文', page: state.page, config });
    if (!response.ok) throw new Error(response.error);
    state.output = response.text;
    renderResult();
    el.status.textContent = '处理完成。可保存为 Markdown 文件。';
  } catch (error) { el.status.textContent = `处理失败：${error.message}`; }
  finally { state.requestId = null; setBusy(false); }
}

function renderResult() {
  const now = new Date().toLocaleString('zh-CN');
  el.title.textContent = state.page.title; el.url.textContent = state.page.url; el.url.href = state.page.url; el.time.textContent = `生成时间：${now}`;
  el.content.textContent = state.output; el.result.hidden = false; el.save.disabled = false; el.noLocal.disabled = false;
}

async function terminate() {
  if (state.requestId) await chrome.runtime.sendMessage({ type: 'CANCEL_REQUEST', requestId: state.requestId });
  el.status.textContent = '已请求停止当前任务。';
}

async function saveSettings() {
  await chrome.storage.local.set({ apiKey: el.key.value.trim(), apiUrl: el.apiUrl.value.trim(), model: el.model.value.trim() || 'deepseek-chat' });
  el.status.textContent = '设置已保存到本地。'; el.settings.hidden = true;
}

async function saveMarkdown() {
  if (!state.output) return;
  const now = new Date(); const date = now.toISOString().slice(0, 10);
  const heading = state.type === 'summarize' ? '总结' : `翻译（${el.language.value || '中文'}）`;
  const markdown = `# ${state.page.title}\n\n网址：${state.page.url}\n\n时间：${now.toLocaleString('zh-CN')}\n\n---\n\n## ${heading}\n\n${state.output}\n`;
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  try { await chrome.downloads.download({ url, filename: `网页AI助手/${safeName(state.page.title)}_${date}.md`, conflictAction: 'uniquify', saveAs: false }); el.status.textContent = '已保存至默认下载目录的“网页AI助手”文件夹。'; }
  catch (error) { el.status.textContent = `保存失败：${error.message}`; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function safeName(name) { return name.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 70) || '网页内容'; }
function setBusy(busy) { el.summarize.disabled = busy; el.translate.disabled = busy; el.terminate.disabled = !busy; }
