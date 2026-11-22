# 县城浮世绘 · 领卡处

勾选取材授权，把提示词发给常用 AI，再把它的回复贴回网页翻开人物卡。可以给自己领卡，也可以看看自己的 AI 像哪位县城角色。[打开领卡处](https://yuxuan6426.github.io/CountyUkiyoe-Play/)

提示词默认请 AI 参考当前对话，以及它已有权限读取的记忆、历史对话和当前项目任务。网页在当前浏览器匹配贴回的普通中文回复、角色名或编号及带标签的数据。角色分享链接携带角色编号和领卡模式，个人 PNG 由玩家预览后保存。

## 本地预览

```sh
python build.py
python -m http.server 8104 --bind 127.0.0.1 --directory dist
```

打开 [本地领卡处](http://127.0.0.1:8104/)。运行 `node --test tests/core.test.mjs` 校验回执、匹配和分享链接。打包或换用服务器时见 [部署说明](DEPLOY.md)。肖像来自 [县城浮世绘人物图鉴](https://github.com/yuxuan6426/CountyUkiyoe)。[肖像许可](ASSET-LICENSE.md)
