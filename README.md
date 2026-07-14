# 网页 AI 助手（MVP）

一个 Chrome Manifest V3 插件：对当前网页进行 AI 总结或翻译，并下载 Markdown 文件。

## 安装

1. 在 Chrome 地址栏打开 `chrome://extensions`。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本项目文件夹。
4. 打开一个普通网页，点击工具栏中的“网页 AI 助手”图标。
5. 点击齿轮图标，填写 DeepSeek API Key，默认接口和模型分别为 `https://api.deepseek.com/chat/completions`、`deepseek-chat`。

## 使用

- **Summarize**：以中文生成摘要、关键观点和关键词。
- **Translate**：默认翻译为中文；可编辑右侧的目标语言。
- **Save Local**：下载最近一次结果为 Markdown，保存到 Chrome 默认下载位置下的 `网页AI助手` 文件夹。
- **Terminate**：取消正在进行的 AI 请求。
- **No Local**：保留窗口中的结果，不下载文件。

API Key 仅保存于当前 Chrome 配置的本地扩展存储，不会写入源代码。此版本先支持 DeepSeek 及已声明域名的 OpenAI 兼容接口；增加其他服务需在 `manifest.json` 中增加对应的 API 域名权限。
