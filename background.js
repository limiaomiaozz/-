const requests = new Map();
let assistantWindowId;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith('http')) return;
  if (assistantWindowId) { try { await chrome.windows.update(assistantWindowId, { focused: true }); return; } catch { assistantWindowId = undefined; } }
  const window = await chrome.windows.create({ url: `${chrome.runtime.getURL('popup.html')}?tabId=${tab.id}`, type: 'popup', width: 500, height: 700 });
  assistantWindowId = window.id;
});
chrome.windows.onRemoved.addListener((windowId) => { if (windowId === assistantWindowId) assistantWindowId = undefined; });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    chrome.tabs.sendMessage(message.tabId, { type: 'EXTRACT' }).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'AI_REQUEST') { requestAI(message).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message })); return true; }
  if (message.type === 'CANCEL_REQUEST') { requests.get(message.requestId)?.abort(); sendResponse({ ok: true }); }
});

async function requestAI({ requestId, task, targetLanguage, page, config }) {
  const controller = new AbortController(); requests.set(requestId, controller);
  const system = task === 'summarize'
    ? '你是网页内容助手。仅依据用户提供的网页正文，以中文输出 Markdown。必须包含以下三个二级标题：## 内容摘要、## 关键观点、## 关键词。关键观点使用编号列表，关键词用逗号分隔。简洁准确，不要编造。'
    : `你是专业翻译。将用户提供的网页正文翻译成${targetLanguage}。保留标题、段落与列表结构，不要添加解释。`;
  try {
    const response = await fetch(config.apiUrl, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: `网页标题：${page.title}\n网页链接：${page.url}\n\n网页正文：\n${page.text}` }], temperature: 0.3 }) });
    if (!response.ok) throw new Error(`AI 接口返回 ${response.status}：${await response.text()}`);
    const data = await response.json(); const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('AI 接口没有返回可用内容。');
    return { ok: true, text };
  } catch (error) { if (error.name === 'AbortError') throw new Error('任务已停止。'); throw error; }
  finally { requests.delete(requestId); }
}
