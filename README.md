# 冷月疏光 · 个人主页

原生 HTML、CSS 与 JavaScript，适用于 GitHub Pages。无需安装前端依赖。

## 页面和内容

- 首页显示个人介绍、游戏账号、视频、文章和最近更新的项目。视频可以在页内播放，也可以在 YouTube 打开。
- `github/`：个人资料、公开仓库数、收到的星标、注册年数、过去一年贡献日历、语言环图、项目搜索 / 筛选 / 排序和公开活动。
- 简体中文、繁体中文、英文，包含正文、导航、按钮、时间、错误和隐私说明；源站文章和项目简介保留原文。
- 深浅主题、原生视频弹窗、内容分类、账号复制、作品详情、贡献日历键盘操作和减少动态效果支持。

## 目录

```text
index.html                  个人首页
github/index.html           GitHub 档案
config/accounts.json        账号标识；不要把令牌写在这里
config/site.js              GitHub 用户和关联项目
assets/css/                 基础、布局、组件、图表、动画、响应式
assets/js/api/              公开数据读取、校验与规范化
assets/js/pages/            个人首页与 GitHub 页面
assets/js/ui/               渲染、主题、动效
assets/js/i18n.js            三语字典与语言切换
assets/js/utils/            时间、安全链接、统计和筛选
data/                       自动采集的公开资料，带来源和时间
scripts/update-public-data.py 公开账户采集器
scripts/prepare-pages.py    发布打包与旧路由保护
.github/workflows/pages.yml 每小时更新并发布
```

开发工作区中的网站源位于 `github-pages/`；发布仓库直接以根目录提供网站。采集与测试脚本支持这两种目录布局。

## 数据更新

| 内容 | 数据源 |
| --- | --- |
| GitHub 档案、仓库、星数和活动 | 页面打开时请求 GitHub REST API |
| GitHub 每日贡献 | 页面打开时请求 github-contributions-api.jogruber.de，服务缓存最多一小时 |
| 语言分布 | 公开非 Fork 仓库的主语言数量占比，不冒充代码字节占比或技能熟练度 |
| Bilibili 档案 | Bilibili 官方公开名片接口 |
| Minecraft 名称、UUID、皮肤 | Mojang 官方档案与 Session Server |
| Steam 昵称、头像、隐私状态 | Steam Community 公开 XML |
| YouTube 上传内容 | YouTube 官方频道 Atom Feed |
| 专栏选读 | `config/accounts.json` 中的文章 ID，标题由 Bilibili 公开接口读取 |

Steam 资料私密时不会展示在线状态或游戏时长，也不会更改账号隐私设置。Minecraft 资料不提供通用在线状态，所以页面也不编造在线状态。

首页从 GitHub 公开列表中选取最近更新的四个自有项目，跳过 Fork、归档仓库、个人资料仓库和本站仓库。关联项目 qplayer 仅在 GitHub 返回公开仓库时展示。GitHub 页列出该账户的所有公开仓库，“刷新”会重新请求接口。公开接口按访客 IP 限流，部分来源失败时会显示对应提示。

GitHub Actions 每小时第 17 分钟尝试同步 Bilibili、Minecraft、Steam 和 YouTube 并部署，也可以手动运行。首页视频区的“刷新”读取最近一次发布的账号数据。页面标明各账号的同步时间，超过两小时会提示。

## 本地预览

```text
python -m http.server 8080
```

发布仓库访问 `http://localhost:8080/`；开发工作区访问 `http://localhost:8080/github-pages/`。直接双击 HTML 会被浏览器的模块安全策略限制。

重新采集公开数据：

```text
python scripts/update-public-data.py
```

验证：

```text
node --test scripts/github-pages.test.mjs
python -m unittest discover -s scripts -p test_public_data.py
python scripts/prepare-pages.py
```

## 发布和旧路由

Pages 使用 GitHub Actions 发布 `_site`。打包保留仓库原有的公开路由和资源，包括 `404.html`、`CNAME`、Bing / Google 验证文件与整个 `pastebin/`。脚本还会校验保留文件的字节内容；不更改自定义域名。

自定义域名是否能访问仍取决于原有 DNS 和证书设置。此项目不修改这些设置。
