# 县城浮世绘 · 领卡处

勾选取材授权，把提示词发给常用 AI，再把它的回复贴回网页翻开人物卡。可以给自己领卡，也可以看看自己的 AI 像哪位县城角色。[打开领卡处](https://card.yuxuan.wiki/)

提示词请 AI 参考当前对话，以及它已有权限读取的记忆、历史对话和当前项目任务，再按 [智能体指南](docs/agent-guide.md) 交回 JSON。网页在当前浏览器翻牌并展示匹配理由、典型表现和判断边界，也能识别普通中文、Markdown、角色名、编号和旧版回执。角色分享链接携带角色编号和领卡模式，个人 PNG 由玩家预览后保存。

## 本地预览

```sh
python build.py
python -m http.server 8104 --bind 127.0.0.1 --directory dist
```

若本机把 `.mjs` 作为普通文本发送，可用下面这条命令指定 JavaScript MIME 类型。

```sh
python -c 'import http.server as h; from functools import partial; h.SimpleHTTPRequestHandler.extensions_map[".mjs"] = "text/javascript"; h.ThreadingHTTPServer(("127.0.0.1", 8104), partial(h.SimpleHTTPRequestHandler, directory="dist")).serve_forever()'
```

打开 [本地领卡处](http://127.0.0.1:8104/)。运行 `node --test tests/core.test.mjs` 校验回执、匹配和分享链接。打包或换用服务器时见 [部署说明](DEPLOY.md)。肖像来自 [县城浮世绘人物图鉴](https://github.com/yuxuan6426/CountyUkiyoe)。[肖像许可](ASSET-LICENSE.md)
