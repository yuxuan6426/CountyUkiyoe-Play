# 静态站点部署

正式入口为 [card.yuxuan.wiki](https://card.yuxuan.wiki/)。用 Python 3.13 构建正式站点所需的静态文件。

```sh
python build.py --base-url https://card.yuxuan.wiki/
```

把 `dist/` 下的文件发布到站点根目录。服务器应为 `.mjs` 提供 JavaScript MIME 类型，为 `.jpg` 提供 `image/jpeg`，并开启 HTTPS 以启用系统剪贴板与分享功能。

通用静态版可运行 `python build.py` 构建，网页会按访问地址生成回填和分享链接。固定其他站点的公开地址时，传入对应的 `--base-url`。需要压缩交付时可显式传入 `--zip artifacts/CountyUkiyoe-Play.zip`。

部署后验证首页、肖像、复制提示词、导入结果和角色分享页。
