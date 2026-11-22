# 县城浮世绘 · 领卡处

在常用 AI 里提取几项办事习惯，带回网页翻开人物卡。可给自己领卡，也可看看自己的 AI 像哪位县城角色。[打开领卡处](https://yuxuan6426.github.io/CountyUkiyoe-Play/)

粘贴的回执在当前浏览器里匹配和出图。角色分享链接携带角色编号和领卡模式，个人 PNG 由玩家预览后保存。

## 本地预览

```sh
python build.py
python -m http.server 8104 --bind 127.0.0.1 --directory dist
```

打开 [本地领卡处](http://127.0.0.1:8104/)。运行 `node --test tests/core.test.mjs` 校验回执、匹配和分享链接。打包或换用服务器时见 [部署说明](DEPLOY.md)。肖像来自 [县城浮世绘人物图鉴](https://github.com/yuxuan6426/CountyUkiyoe)。[肖像许可](ASSET-LICENSE.md)
