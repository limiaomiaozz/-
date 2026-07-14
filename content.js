function extractMainContent() {
  const root = document.querySelector('article, main, [role="main"], .article, .post, .content') || document.body;
  const clone = root.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, header, aside, form, button, noscript, iframe, [role="navigation"], [role="banner"], [class*="advert" i], [class*="cookie" i]').forEach(node => node.remove());
  const text = clone.innerText.replace(/\s+/g, ' ').trim().slice(0, 30000);
  return { title: document.title.trim() || '未命名网页', url: location.href, text };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT') sendResponse({ ok: true, page: extractMainContent() });
});
