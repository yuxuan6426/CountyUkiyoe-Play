# 静态站点部署

用 Python 3.13 生成通用包。

```sh
python build.py --zip artifacts/CountyUkiyoe-Play.zip
```

解压后将包含 `index.html` 的整个目录作为静态站点发布，可放在域名根路径或独立子目录。通用包用访问地址生成领题回链与角色链接。若要固定公开地址，用 `python build.py --base-url https://example.com/play/ --zip artifacts/CountyUkiyoe-Play.zip` 构建。服务器应为 `.mjs` 提供 JavaScript MIME 类型，为 `.jpg` 提供 `image/jpeg`，并开启 HTTPS 以启用系统剪贴板与分享功能。

从目标地区验证首次打开、原图加载、复制提示词、导入结果和分享页。分享图使用出图时的站点地址，迁移后可以保留原 Pages 入口承接已分享的链接。
