# 县城浮世绘 · 领卡处

勾选取材授权，把提示词发给常用 AI，再把它的回复贴回网页翻开人物卡。可以给自己领卡，也可以看看自己的 AI 像哪位县城角色。[打开领卡处](https://card.yuxuan.wiki/)

提示词请 AI 参考当前对话，以及它已有权限读取的记忆、历史对话和当前项目任务，再按 [智能体指南](docs/agent-guide.md) 交回 JSON。网页在当前浏览器翻牌并展示匹配理由、典型表现和判断边界，也能识别普通中文、Markdown、角色名、编号和旧版回执。427 位公开图鉴角色均可领卡。复制分享文案会带上角色邀请和深链接，分享 PNG 的二维码打开同一张卡。

## 本地预览

按[部署说明](DEPLOY.md)准备固定版本的公开图鉴，默认放在 `.gallery-source`。已有同版本导出时，可将其根目录传给 `--gallery-source`。

```sh
python build.py
python -m http.server 8104 --bind 127.0.0.1 --directory dist
```

若本机把 `.mjs` 作为普通文本发送，可用下面这条命令指定 JavaScript MIME 类型。

```sh
python -c 'import http.server as h; from functools import partial; h.SimpleHTTPRequestHandler.extensions_map[".mjs"] = "text/javascript"; h.ThreadingHTTPServer(("127.0.0.1", 8104), partial(h.SimpleHTTPRequestHandler, directory="dist")).serve_forever()'
```

打开 [本地领卡处](http://127.0.0.1:8104/)。运行 `node --test tests/core.test.mjs` 校验回执、匹配和分享链接。打包或换用服务器时见 [部署说明](DEPLOY.md)。肖像来自 [县城浮世绘人物图鉴](https://github.com/yuxuan6426/CountyUkiyoe)。[肖像许可](ASSET-LICENSE.md)

## 部署入口

| 站点 | GitHub Pages | 独立域名 |
| --- | --- | --- |
| 县城浮世绘人物图鉴 | [Pages](https://yuxuan6426.github.io/CountyUkiyoe/) | [Wiki](https://xian.yuxuan.wiki/) |
| 县城隐藏属性测试 | [Pages](https://yuxuan6426.github.io/CountyUkiyoe-Quiz/) | [Wiki](https://quiz.yuxuan.wiki/) |
| 县城浮世绘 AI 领卡处 | [Pages](https://yuxuan6426.github.io/CountyUkiyoe-Play/) | [Wiki](https://card.yuxuan.wiki/) |

## 目录与维护

```text
public/           页面的 HTML、CSS、脚本和配置
tests/            回执、匹配与分享回归
docs/             AI 回执指南与开发记录
dist/             构建输出
```

```sh
python build.py --gallery-source .gallery-source --base-url https://card.yuxuan.wiki/
node --test tests/core.test.mjs
```

生成目录为本次构建产物。代码遵循 [代码许可](LICENSE)，图鉴原创资产适用[图文许可](ASSET-LICENSE.md)。另见 [维护代理指引](AGENTS.md)、[AI 使用指引](docs/agent-guide.md)及[安全政策](SECURITY.md)。

## English overview

An AI-assisted card picker. Use the consent step, supply the prompt to an AI, and paste back a compatible receipt or pick a character manually.
