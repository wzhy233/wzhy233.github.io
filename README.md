# 冷月疏光 · 个人主页

原生 HTML、CSS 与 JavaScript，适用于 GitHub Pages。无需安装前端依赖。

## 页面和内容

- 首页：个人介绍、Minecraft / CS2、YouTube 影像、Bilibili 专栏、精选项目与六个社交入口。
- `github/`：个人资料、公开仓库数、收到的星标、注册年数、过去一年贡献日历、语言环图、项目搜索 / 筛选 / 排序和公开活动。
- 简体中文、繁体中文、英文，包含正文、导航、按钮、时间、错误和隐私说明；源站文章和项目简介保留原文。
- 深浅主题、原生视频弹窗、内容分类、账号复制、作品详情、贡献日历键盘操作和减少动态效果支持。

## 目录

```text
index.html                  个人首页
github/index.html           GitHub 档案
config/accounts.json        账号标识；不要把令牌写在这里
config/projects.json        人工选择的项目地址
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

## 真实数据与隐私

所有账户资料都由采集器请求公开接口生成，不手填统计、不伪造活动、不把失败请求标记为成功：

| 内容 | 数据源 |
| --- | --- |
| GitHub 档案、仓库、星数和活动 | GitHub REST API |
| GitHub 每日贡献 | github-contributions-api.jogruber.de，读取 GitHub 公开贡献，服务缓存最多一小时 |
| 语言分布 | 公开非 Fork 仓库的主语言数量占比，不冒充代码字节占比或技能熟练度 |
| Bilibili 档案 | Bilibili 官方公开名片接口 |
| Minecraft 名称、UUID、皮肤 | Mojang 官方档案与 Session Server |
| Steam 昵称、头像、隐私状态 | Steam Community 公开 XML |
| YouTube 上传内容 | YouTube 官方频道 Atom Feed |
| 专栏选读 | `config/accounts.json` 中的文章 ID，标题由 Bilibili 公开接口读取 |

Steam 资料私密时不会展示在线状态或游戏时长，也不会更改账号隐私设置。Minecraft 资料不提供通用在线状态，所以页面也不编造在线状态。

GitHub Actions 每小时第 17 分钟重新采集并部署；支持手动运行。网页“刷新”读取最近一次自动同步的文件，不承诺实时推送。各账户显示实际更新时间；超过两小时会标记过期。单一来源失败只影响对应区域，失败结果不会拿旧数据冒充新数据。

Actions 使用自带的 `github.token` 读取公开 GitHub API，避免访客浏览器共享未登录限流。令牌只在构建环境中使用，不写入网页或数据文件。其他来源不使用登录 Cookie。第三方来源仍可能限流或暂时不可用，页面会明确提示。

## 本地预览

```text
python -m http.server 8080
```

发布仓库访问 `http://localhost:8080/`；开发工作区访问 `http://localhost:8080/github-pages/`。直接双击 HTML 会被浏览器的模块安全策略限制。

重新采集公开数据：

```text
python scripts/update-public-data.py
```

本地 GitHub API 如果已限流，可等待恢复，或由 Actions 使用内置令牌更新；不要把个人令牌放进前端。

验证：

```text
node --test scripts/github-pages.test.mjs
python -m unittest discover -s scripts -p test_public_data.py
python scripts/prepare-pages.py
```

## 发布和旧路由

Pages 使用 GitHub Actions 发布 `_site`。打包保留仓库原有的公开路由和资源，包括 `404.html`、`CNAME`、Bing / Google 验证文件与整个 `pastebin/`。脚本还会校验保留文件的字节内容；不更改自定义域名。

自定义域名是否能访问仍取决于原有 DNS 和证书设置。此项目不修改这些设置。
