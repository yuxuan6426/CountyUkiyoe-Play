# 县城浮世绘 AI 领卡处维护指引

保留 V1–V3 回执、旧人物链接和明确的用户同意流程。先读 `docs/agent-guide.md` 的 AI 回执契约，再修改 `public/core.mjs` 或 `public/app.mjs`。

## 构建和验收

- `python build.py --gallery-source .gallery-source --base-url https://card.yuxuan.wiki/`
- `node --test tests/core.test.mjs`

在空目录构建，以 `release.sha256` 核对产物，并通过 HTTP 验证桌面和移动端。Pages 与 Wiki 入口分别生成本站址和站际链接。只将公开数据和列入构建规则的文件放进发布目录。许可及第三方依赖见 README。
