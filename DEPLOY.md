# 静态站点部署

正式入口为 [card.yuxuan.wiki](https://card.yuxuan.wiki/)。用 Python 3.13 构建正式站点所需的静态文件。构建读取固定版本的公开图鉴，并校验 427 张原版肖像。

```sh
git clone --filter=blob:none --sparse https://github.com/yuxuan6426/CountyUkiyoe.git .gallery-source
git -C .gallery-source checkout --detach 6c4154d4f5bf903d3ce6e944507a6106e23bc854
git -C .gallery-source sparse-checkout set gallery
python build.py --base-url https://card.yuxuan.wiki/
```

把 `dist/` 下的文件发布到站点根目录。服务器应为 `.mjs` 提供 JavaScript MIME 类型，为 `.jpg` 提供 `image/jpeg`，并开启 HTTPS 以启用系统剪贴板与分享功能。

通用静态版可运行 `python build.py` 构建，网页会按访问地址生成回填和分享链接。固定其他站点的公开地址时，传入对应的 `--base-url`。需要压缩交付时可显式传入 `--zip artifacts/CountyUkiyoe-Play.zip`。

部署后验证首页、候选目录、肖像、复制提示词、新旧回执、分享文案，以及下载 PNG 的二维码和角色链接是否一致。正式域名由宝塔静态站提供服务，GitHub Pages 独立发布。
